const { Pool } = require('pg');

const { env } = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPoolMax,
  connectionTimeoutMillis: env.dbConnectionTimeoutMs,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

async function query(text, values) {
  return pool.query(text, values);
}

async function checkDatabaseConnection() {
  const result = await query('SELECT NOW() AS server_time');
  return result.rows[0].server_time;
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  checkDatabaseConnection,
  closeDatabase,
};
