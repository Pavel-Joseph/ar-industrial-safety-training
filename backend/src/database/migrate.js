const { closeDatabase } = require('../config/database');
const { runSqlFile } = require('./run-sql-file');

async function migrate() {
  await runSqlFile('../../database/migrations/001_initial_schema.sql');
  console.log('Initial database migration completed');
}

migrate()
  .catch((error) => {
    console.error('Database migration failed', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
