const { pool, query } = require('../config/database');
const { env } = require('../config/env');
const { AppError } = require('../utils/app-error');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISCLAIMER =
  'DGMS-aligned training prototype. This is not a certificate issued, approved or accredited by DGMS.';

const SELECT_CERTIFICATE = `
  SELECT c.id, c.public_verification_id, c.training_attempt_id,
         c.status AS stored_status,
         CASE WHEN c.status IN ('revoked', 'expired') THEN c.status
              WHEN c.expires_at <= NOW() THEN 'expired'
              ELSE 'valid' END AS effective_status,
         c.issued_at, c.expires_at, c.revoked_at, c.revocation_reason,
         ta.attempt_id, ta.module_version, ta.scoring_version,
         w.id AS worker_id, w.full_name AS worker_name,
         w.employee_code, m.id AS module_id, m.name AS module_name,
         ar.percentage, ar.passed
    FROM certificates c
    JOIN training_attempts ta ON ta.id = c.training_attempt_id
    JOIN workers w ON w.id = ta.worker_id
    JOIN modules m ON m.id = ta.module_id
    JOIN assessment_results ar ON ar.training_attempt_id = ta.id`;

function verificationUrl(publicId) {
  return `${env.publicBaseUrl}/verify/${publicId}`;
}

function mapCertificate(row) {
  return {
    id: row.id,
    publicId: row.public_verification_id,
    attemptId: row.attempt_id,
    worker: {
      id: row.worker_id,
      employeeCode: row.employee_code,
      fullName: row.worker_name,
    },
    module: {
      id: row.module_id,
      name: row.module_name,
      version: row.module_version,
      scoringVersion: row.scoring_version,
    },
    score: { percentage: Number(row.percentage), passed: row.passed },
    status: row.effective_status,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    verificationUrl: verificationUrl(row.public_verification_id),
    qrSvgUrl: `/api/certificates/${row.id}/qr.svg`,
    documentHtmlUrl: `/api/certificates/${row.id}/document.html`,
    disclaimer: DISCLAIMER,
  };
}

function assertUuid(value, label) {
  if (!UUID_PATTERN.test(value)) {
    throw new AppError(400, `INVALID_${label.toUpperCase()}_ID`, `${label} ID must be a UUID`);
  }
}

async function getCertificate(certificateId) {
  assertUuid(certificateId, 'certificate');
  const result = await query(`${SELECT_CERTIFICATE} WHERE c.id = $1`, [certificateId]);
  if (!result.rows[0]) {
    throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate was not found');
  }
  return mapCertificate(result.rows[0]);
}

async function listCertificates(queryParams) {
  const values = [];
  const filters = [];
  if (queryParams.workerId) {
    assertUuid(queryParams.workerId, 'worker');
    values.push(queryParams.workerId);
    filters.push(`ta.worker_id = $${values.length}`);
  }
  if (queryParams.moduleId) {
    values.push(queryParams.moduleId);
    filters.push(`ta.module_id = $${values.length}`);
  }
  if (queryParams.status) {
    if (!['valid', 'revoked', 'expired'].includes(queryParams.status)) {
      throw new AppError(400, 'INVALID_STATUS', 'Status must be valid, revoked or expired');
    }
    values.push(queryParams.status);
    filters.push(`(CASE WHEN c.status IN ('revoked', 'expired') THEN c.status
                        WHEN c.expires_at <= NOW() THEN 'expired'
                        ELSE 'valid' END) = $${values.length}`);
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = Math.min(Math.max(Number.parseInt(queryParams.limit || '50', 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(queryParams.offset || '0', 10) || 0, 0);
  const countResult = await query(
    `SELECT COUNT(*)::integer AS total
       FROM certificates c
       JOIN training_attempts ta ON ta.id = c.training_attempt_id
       ${whereClause}`,
    values,
  );
  const result = await query(
    `${SELECT_CERTIFICATE} ${whereClause}
     ORDER BY c.issued_at DESC, c.id DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  );
  return {
    data: result.rows.map(mapCertificate),
    meta: { total: countResult.rows[0].total, limit, offset },
  };
}

async function issueCertificate({ attemptId, expiresAt }, issuerId) {
  const client = await pool.connect();
  let certificateId;
  let created = false;
  try {
    await client.query('BEGIN');
    const attemptResult = await client.query(
      `SELECT ta.id, ta.status, ar.passed, w.active AS worker_active
         FROM training_attempts ta
         LEFT JOIN assessment_results ar ON ar.training_attempt_id = ta.id
         JOIN workers w ON w.id = ta.worker_id
        WHERE ta.attempt_id = $1
        FOR UPDATE OF ta`,
      [attemptId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Training attempt was not found');
    if (attempt.status !== 'validated' || !attempt.passed) {
      throw new AppError(409, 'NOT_ELIGIBLE', 'Only a validated passing attempt is eligible');
    }
    if (!attempt.worker_active) {
      throw new AppError(409, 'WORKER_INACTIVE', 'The worker is inactive');
    }

    const existing = await client.query(
      'SELECT id, expires_at FROM certificates WHERE training_attempt_id = $1',
      [attempt.id],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].expires_at?.toISOString() !== expiresAt) {
        throw new AppError(409, 'CERTIFICATE_EXISTS', 'The attempt already has a certificate with a different expiry');
      }
      certificateId = existing.rows[0].id;
    } else {
      const inserted = await client.query(
        `INSERT INTO certificates (training_attempt_id, expires_at, issued_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [attempt.id, expiresAt, issuerId],
      );
      certificateId = inserted.rows[0].id;
      created = true;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return { created, data: await getCertificate(certificateId) };
}

async function revokeCertificate(certificateId, reason, revokerId) {
  assertUuid(certificateId, 'certificate');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'SELECT status, revocation_reason FROM certificates WHERE id = $1 FOR UPDATE',
      [certificateId],
    );
    if (!result.rows[0]) {
      throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate was not found');
    }
    if (result.rows[0].status === 'revoked') {
      if (result.rows[0].revocation_reason !== reason) {
        throw new AppError(409, 'ALREADY_REVOKED', 'Certificate is already revoked for a different reason');
      }
    } else {
      await client.query(
        `UPDATE certificates
            SET status = 'revoked', revoked_at = NOW(),
                revoked_by = $2, revocation_reason = $3
          WHERE id = $1`,
        [certificateId, revokerId, reason],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getCertificate(certificateId);
}

async function verifyCertificate(publicId) {
  assertUuid(publicId, 'public');
  const result = await query(
    `${SELECT_CERTIFICATE} WHERE c.public_verification_id = $1`,
    [publicId],
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate was not found');
  }
  const row = result.rows[0];
  return {
    publicId: row.public_verification_id,
    status: row.effective_status,
    valid: row.effective_status === 'valid',
    workerName: row.worker_name,
    moduleName: row.module_name,
    moduleVersion: row.module_version,
    scorePercentage: Number(row.percentage),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    disclaimer: DISCLAIMER,
  };
}

module.exports = {
  issueCertificate,
  listCertificates,
  getCertificate,
  revokeCertificate,
  verifyCertificate,
  verificationUrl,
};
