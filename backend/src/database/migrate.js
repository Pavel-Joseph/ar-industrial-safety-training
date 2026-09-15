const fs = require('node:fs/promises');
const path = require('node:path');

const { closeDatabase, pool } = require('../config/database');

async function migrate() {
  const directory = path.resolve(__dirname, '../../database/migrations');
  const files = (await fs.readdir(directory))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const filename of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
      );
      if (existing.rowCount) {
        console.log(`Skipping applied migration ${filename}`);
        continue;
      }

      const sql = await fs.readFile(path.join(directory, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Applied migration ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
}

migrate()
  .catch((error) => {
    console.error('Database migration failed', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
