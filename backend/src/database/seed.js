const { closeDatabase } = require('../config/database');
const { runSqlFile } = require('./run-sql-file');

async function seed() {
  await runSqlFile('../../database/seeds/001_demo_data.sql');
  console.log('Demonstration data loaded');
}

seed()
  .catch((error) => {
    console.error('Database seed failed', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
