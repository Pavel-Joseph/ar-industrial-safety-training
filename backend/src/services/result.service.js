const { query } = require('../config/database');
const { AppError } = require('../utils/app-error');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapResult(row) {
  return {
    attemptId: row.attempt_id,
    worker: {
      id: row.worker_id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
    },
    module: {
      id: row.module_id,
      name: row.module_name,
      version: row.module_version,
      scoringVersion: row.scoring_version,
    },
    score: {
      total: Number(row.total_score),
      maximum: Number(row.maximum_score),
      percentage: Number(row.percentage),
      passed: row.passed,
    },
    languageCode: row.language_code,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    evaluatedAt: row.evaluated_at,
  };
}

const SELECT_RESULT = `
  SELECT ta.attempt_id,
         ta.worker_id,
         w.employee_code,
         w.full_name,
         ta.module_id,
         m.name AS module_name,
         ta.module_version,
         ta.scoring_version,
         ta.language_code,
         ta.started_at,
         ta.completed_at,
         ar.total_score,
         ar.maximum_score,
         ar.percentage,
         ar.passed,
         ar.evaluated_at
    FROM assessment_results ar
    JOIN training_attempts ta ON ta.id = ar.training_attempt_id
    JOIN workers w ON w.id = ta.worker_id
    JOIN modules m ON m.id = ta.module_id`;

function parsePagination(queryParams) {
  const requestedLimit = Number.parseInt(queryParams.limit || '50', 10);
  const requestedOffset = Number.parseInt(queryParams.offset || '0', 10);
  return {
    limit: Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 50,
    offset: Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0,
  };
}

async function listResults(queryParams) {
  const { limit, offset } = parsePagination(queryParams);
  const values = [];
  const filters = [];

  if (queryParams.workerId) {
    if (!UUID_PATTERN.test(queryParams.workerId)) {
      throw new AppError(400, 'INVALID_WORKER_ID', 'Worker ID must be a UUID');
    }
    values.push(queryParams.workerId);
    filters.push(`ta.worker_id = $${values.length}`);
  }
  if (queryParams.moduleId) {
    values.push(queryParams.moduleId);
    filters.push(`ta.module_id = $${values.length}`);
  }
  if (queryParams.passed === 'true' || queryParams.passed === 'false') {
    values.push(queryParams.passed === 'true');
    filters.push(`ar.passed = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countResult = await query(
    `SELECT COUNT(*)::INTEGER AS total
       FROM assessment_results ar
       JOIN training_attempts ta ON ta.id = ar.training_attempt_id
       ${whereClause}`,
    values,
  );
  const listValues = [...values, limit, offset];
  const result = await query(
    `${SELECT_RESULT}
     ${whereClause}
     ORDER BY ar.evaluated_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues,
  );

  return {
    data: result.rows.map(mapResult),
    meta: { total: countResult.rows[0].total, limit, offset },
  };
}

async function getResult(attemptId) {
  if (!UUID_PATTERN.test(attemptId)) {
    throw new AppError(400, 'INVALID_ATTEMPT_ID', 'Attempt ID must be a UUID');
  }

  const result = await query(`${SELECT_RESULT} WHERE ta.attempt_id = $1`, [attemptId]);
  if (!result.rows[0]) {
    throw new AppError(404, 'RESULT_NOT_FOUND', 'Assessment result was not found');
  }
  return mapResult(result.rows[0]);
}

module.exports = { listResults, getResult };
