const { query } = require('../config/database');
const { AppError } = require('../utils/app-error');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapWorker(row) {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    preferredLanguage: row.preferred_language,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listWorkers(queryParams) {
  const requestedLimit = Number.parseInt(queryParams.limit || '50', 10);
  const requestedOffset = Number.parseInt(queryParams.offset || '0', 10);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;
  const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
  const search = typeof queryParams.search === 'string' ? queryParams.search.trim() : '';
  const active =
    queryParams.active === 'true' ? true : queryParams.active === 'false' ? false : undefined;

  const values = [];
  const filters = [];
  if (search) {
    values.push(`%${search}%`);
    filters.push(`(employee_code ILIKE $${values.length} OR full_name ILIKE $${values.length})`);
  }
  if (active !== undefined) {
    values.push(active);
    filters.push(`active = $${values.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const countResult = await query(`SELECT COUNT(*)::INTEGER AS total FROM workers ${whereClause}`, values);

  const listValues = [...values, limit, offset];
  const result = await query(
    `SELECT id, employee_code, full_name, preferred_language, active, created_at, updated_at
       FROM workers
       ${whereClause}
      ORDER BY full_name ASC
      LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    listValues,
  );

  return {
    data: result.rows.map(mapWorker),
    meta: { total: countResult.rows[0].total, limit, offset },
  };
}

async function getWorker(workerId) {
  if (!UUID_PATTERN.test(workerId)) {
    throw new AppError(400, 'INVALID_WORKER_ID', 'Worker ID must be a UUID');
  }

  const result = await query(
    `SELECT id, employee_code, full_name, preferred_language, active, created_at, updated_at
       FROM workers
      WHERE id = $1`,
    [workerId],
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker was not found');
  }

  return mapWorker(result.rows[0]);
}

async function createWorker(worker) {
  try {
    const result = await query(
      `INSERT INTO workers (employee_code, full_name, preferred_language)
       VALUES ($1, $2, $3)
       RETURNING id, employee_code, full_name, preferred_language, active, created_at, updated_at`,
      [worker.employeeCode, worker.fullName, worker.preferredLanguage],
    );
    return mapWorker(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(409, 'EMPLOYEE_CODE_EXISTS', 'Employee code already exists');
    }
    throw error;
  }
}

module.exports = { listWorkers, getWorker, createWorker };
