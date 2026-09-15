const assert = require('node:assert/strict');
const { test } = require('node:test');

const { hashPassword, verifyPassword } = require('../src/services/password.service');
const { signAccessToken, verifyAccessToken } = require('../src/services/token.service');

test('password hashing verifies the correct password only', async () => {
  const hash = await hashPassword('correct-horse-battery-staple');

  assert.notEqual(hash, 'correct-horse-battery-staple');
  assert.equal(await verifyPassword('correct-horse-battery-staple', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('malformed password hashes fail closed', async () => {
  assert.equal(await verifyPassword('password', 'scrypt$bad$hash'), false);
});

test('access tokens contain the authenticated identity', () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'admin@example.com',
    role: 'admin',
  });
  const payload = verifyAccessToken(token);

  assert.equal(payload.sub, '87c16c44-4efd-4a9f-ac47-48ae83727125');
  assert.equal(payload.email, 'admin@example.com');
  assert.equal(payload.role, 'admin');
});

test('tampered access tokens are rejected', () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'admin@example.com',
    role: 'admin',
  });
  const [header, payload] = token.split('.');

  assert.throws(() => verifyAccessToken(`${header}.${payload}.invalid`), {
    code: 'INVALID_TOKEN',
  });
});
