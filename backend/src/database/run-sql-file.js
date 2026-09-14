const fs = require('node:fs/promises');
const path = require('node:path');

const { pool } = require('../config/database');

async function runSqlFile(relativePath) {
  const filePath = path.resolve(__dirname, relativePath);
  const sql = await fs.readFile(filePath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { runSqlFile };
