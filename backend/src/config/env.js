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

function parsePublicBaseUrl(rawValue) {
  let url;
  try {
    url = new URL(rawValue);
  } catch (_error) {
    throw new Error('PUBLIC_BASE_URL must be an absolute HTTP or HTTPS URL');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username || url.password || url.search || url.hash
  ) {
    throw new Error('PUBLIC_BASE_URL must be an absolute HTTP or HTTPS URL without credentials, query or fragment');
  }
  const baseUrl = url.href.replace(/\/$/, '');
  if (Buffer.byteLength(`${baseUrl}/verify/${'0'.repeat(36)}`) > 271) {
    throw new Error('PUBLIC_BASE_URL is too long for certificate QR codes');
  }
  return baseUrl;
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInteger('PORT', 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/ar_safety_training',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  publicBaseUrl: parsePublicBaseUrl(process.env.PUBLIC_BASE_URL || 'http://localhost:3000'),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresInSeconds: parseInteger('JWT_EXPIRES_IN_SECONDS', 28_800),
  dbPoolMax: parseInteger('DB_POOL_MAX', 10),
  dbConnectionTimeoutMs: parseInteger('DB_CONNECTION_TIMEOUT_MS', 5000),
  demoAdminEmail: process.env.DEMO_ADMIN_EMAIL || '',
  demoAdminPassword: process.env.DEMO_ADMIN_PASSWORD || '',
});

if (
  env.nodeEnv === 'production' &&
  (env.jwtSecret === 'development-only-change-me' || env.jwtSecret.length < 32)
) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production');
}

if (env.nodeEnv === 'production' && !env.publicBaseUrl.startsWith('https://')) {
  throw new Error('PUBLIC_BASE_URL must use HTTPS in production');
}

module.exports = { env };
