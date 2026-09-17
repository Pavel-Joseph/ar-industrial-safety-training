const { createHash } = require('node:crypto');

const { pool } = require('../config/database');
const { AppError } = require('../utils/app-error');
const { evaluateAssessment } = require('./assessment.service');

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]),
    );
  }
  return value;
}

function payloadHash(attempt) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalJson(attempt)))
    .digest('hex');
}

function acknowledgement(attemptId, result, duplicate) {
  return {
    attemptId,
    syncStatus: duplicate ? 'already-accepted' : 'accepted',
    resultStatus: 'evaluated',
    certificateStatus: result.certificate_status || 'not-issued',
    score: {
      total: Number(result.total_score),
      maximum: Number(result.maximum_score),
      percentage: Number(result.percentage),
      passed: result.passed,
    },
  };
}

async function existingAcknowledgement(client, attemptId, hash) {
  const existing = await client.query(
    `SELECT ta.payload_hash, ar.total_score, ar.maximum_score,
            ar.percentage, ar.passed,
            CASE WHEN c.id IS NULL THEN 'not-issued'
                 WHEN c.status IN ('revoked', 'expired') THEN c.status
                 WHEN c.expires_at <= NOW() THEN 'expired'
                 ELSE 'valid' END AS certificate_status
       FROM training_attempts ta
       LEFT JOIN assessment_results ar ON ar.training_attempt_id = ta.id
       LEFT JOIN certificates c ON c.training_attempt_id = ta.id
      WHERE ta.attempt_id = $1
      FOR UPDATE OF ta`,
    [attemptId],
  );
  if (!existing.rows[0]) return null;
  if (existing.rows[0].payload_hash !== hash) {
    throw new AppError(409, 'ATTEMPT_ID_CONFLICT', 'Attempt ID is already used for different evidence');
  }
  if (existing.rows[0].total_score === null) {
    throw new AppError(409, 'ATTEMPT_NOT_EVALUATED', 'This attempt has no completed assessment result');
  }
  return acknowledgement(attemptId, existing.rows[0], true);
}

async function submitAttempt(attempt) {
  const hash = payloadHash(attempt);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const duplicate = await existingAcknowledgement(client, attempt.attemptId, hash);
    if (duplicate) {
      await client.query('COMMIT');
      return { created: false, data: duplicate };
    }

    const workerResult = await client.query(
      'SELECT active FROM workers WHERE id = $1',
      [attempt.workerId],
    );
    if (!workerResult.rows[0]) {
      throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker was not found');
    }
    if (!workerResult.rows[0].active) {
      throw new AppError(409, 'WORKER_INACTIVE', 'Worker is inactive');
    }

    const moduleResult = await client.query(
      `SELECT current_version, scoring_version, pass_mark, active
         FROM modules WHERE id = $1`,
      [attempt.moduleId],
    );
    const module = moduleResult.rows[0];
    if (!module) throw new AppError(404, 'MODULE_NOT_FOUND', 'Training module was not found');
    if (!module.active) throw new AppError(409, 'MODULE_INACTIVE', 'Training module is inactive');
    if (
      module.current_version !== attempt.moduleVersion ||
      module.scoring_version !== attempt.scoringVersion
    ) {
      throw new AppError(409, 'VERSION_MISMATCH', 'Attempt versions do not match the active module');
    }

    const ruleResult = await client.query(
      `SELECT step_id, maximum_score, correct_value, required, critical
         FROM assessment_rules
        WHERE module_id = $1 AND module_version = $2 AND scoring_version = $3
        ORDER BY step_id`,
      [attempt.moduleId, attempt.moduleVersion, attempt.scoringVersion],
    );
    const score = evaluateAssessment(ruleResult.rows, attempt.actions, Number(module.pass_mark));

    const inserted = await client.query(
      `INSERT INTO training_attempts (
         attempt_id, worker_id, module_id, module_version, scoring_version,
         language_code, started_at, completed_at, status, device_metadata, payload_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'validated', $9::jsonb, $10)
       ON CONFLICT (attempt_id) DO NOTHING
       RETURNING id`,
      [
        attempt.attemptId, attempt.workerId, attempt.moduleId,
        attempt.moduleVersion, attempt.scoringVersion, attempt.languageCode,
        attempt.startedAt, attempt.completedAt,
        JSON.stringify(attempt.deviceMetadata), hash,
      ],
    );

    if (!inserted.rows[0]) {
      const concurrentDuplicate = await existingAcknowledgement(client, attempt.attemptId, hash);
      await client.query('COMMIT');
      return { created: false, data: concurrentDuplicate };
    }

    const trainingAttemptId = inserted.rows[0].id;
    for (const action of attempt.actions) {
      await client.query(
        `INSERT INTO attempt_actions (
           training_attempt_id, step_id, selected_value, occurred_at, sequence_number
         ) VALUES ($1, $2, $3::jsonb, $4, $5)`,
        [
          trainingAttemptId, action.stepId, JSON.stringify(action.selectedValue),
          action.occurredAt, action.sequenceNumber,
        ],
      );
    }

    await client.query(
      `INSERT INTO assessment_results (
         training_attempt_id, total_score, maximum_score, percentage,
         passed, scoring_details
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        trainingAttemptId, score.totalScore, score.maximumScore,
        score.percentage, score.passed, JSON.stringify(score.details),
      ],
    );
    await client.query('COMMIT');
    return {
      created: true,
      data: acknowledgement(attempt.attemptId, {
        total_score: score.totalScore,
        maximum_score: score.maximumScore,
        percentage: score.percentage,
        passed: score.passed,
      }, false),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { submitAttempt };
