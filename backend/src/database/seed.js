const fs = require('node:fs/promises');
const path = require('node:path');

const { closeDatabase, query } = require('../config/database');
const { env } = require('../config/env');
const { hashPassword } = require('../services/password.service');
const { runSqlFile } = require('./run-sql-file');

async function seed() {
  const seedDirectory = path.resolve(__dirname, '../../database/seeds');
  const files = (await fs.readdir(seedDirectory))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const filename of files) {
    await runSqlFile(`../../database/seeds/${filename}`);
    console.log(`Loaded seed ${filename}`);
  }

  if (!env.demoAdminEmail || !env.demoAdminPassword) {
    console.log(
      'Demo admin skipped. Set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in .env, then rerun db:seed.',
    );
    return;
  }

  if (env.demoAdminPassword.length < 12) {
    throw new Error('DEMO_ADMIN_PASSWORD must contain at least 12 characters');
  }

  const passwordHash = await hashPassword(env.demoAdminPassword);
  await query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       updated_at = NOW()`,
    [env.demoAdminEmail.trim().toLowerCase(), passwordHash],
  );
  console.log(`Demo admin ready: ${env.demoAdminEmail.trim().toLowerCase()}`);
}

seed()
  .catch((error) => {
    console.error('Database seed failed', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
