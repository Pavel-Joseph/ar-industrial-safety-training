const path = require('node:path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function parseInteger(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === '') {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInteger('PORT', 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/ar_safety_training',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  dbPoolMax: parseInteger('DB_POOL_MAX', 10),
  dbConnectionTimeoutMs: parseInteger('DB_CONNECTION_TIMEOUT_MS', 5000),
});

module.exports = { env };
