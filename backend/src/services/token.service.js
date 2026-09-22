const { createHmac, timingSafeEqual } = require('node:crypto');

const { env } = require('../config/env');
const { AppError } = require('../utils/app-error');

const ISSUER = 'ar-safety-backend';
const AUDIENCE = 'ar-safety-clients';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signValue(value) {
  return createHmac('sha256', env.jwtSecret).update(value).digest('base64url');
}

function signAccessToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: user.id,
    email: user.email,
    employeeCode: user.employeeCode,
    role: user.role,
    iss: ISSUER,
    aud: AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + env.jwtExpiresInSeconds,
  });
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${signValue(unsignedToken)}`;
}

function verifyAccessToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid');
  }

  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signValue(unsignedToken);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid');
  }

  let header;
  let payload;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (_error) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid');
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    header.alg !== 'HS256' ||
    header.typ !== 'JWT' ||
    payload.iss !== ISSUER ||
    payload.aud !== AUDIENCE ||
    !payload.sub ||
    !payload.role ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= now
  ) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired');
  }

  return payload;
}

module.exports = { signAccessToken, verifyAccessToken };
