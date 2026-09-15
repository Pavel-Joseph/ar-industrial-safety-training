const { query } = require('../config/database');
const { AppError } = require('../utils/app-error');

function mapModule(row) {
  return {
    id: row.id,
    name: row.name,
    currentVersion: row.current_version,
    scoringVersion: row.scoring_version,
    passMark: Number(row.pass_mark),
    required: row.required,
    active: row.active,
  };
}

async function listModules() {
  const result = await query(
    `SELECT id, name, current_version, scoring_version, pass_mark, required, active
       FROM modules
      WHERE active = TRUE
      ORDER BY required DESC, name ASC`,
  );
  return result.rows.map(mapModule);
}

async function getModule(moduleId) {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(moduleId)) {
    throw new AppError(400, 'INVALID_MODULE_ID', 'Module ID is invalid');
  }

  const result = await query(
    `SELECT id, name, current_version, scoring_version, pass_mark, required, active
       FROM modules
      WHERE id = $1`,
    [moduleId],
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'MODULE_NOT_FOUND', 'Training module was not found');
  }
  return mapModule(result.rows[0]);
}

module.exports = { listModules, getModule };
