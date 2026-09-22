const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { createApp } = require('../src/app');
const { closeDatabase } = require('../src/config/database');
const { signAccessToken } = require('../src/services/token.service');

let baseUrl;
let server;

before(async () => {
  const app = createApp();

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await closeDatabase();
});

test('GET / identifies the service', async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.service, 'ar-safety-backend');
  assert.equal(body.health, '/api/health');
  assert.ok(response.headers.get('x-request-id'));
});

test('unknown routes return the common error format', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
  assert.ok(body.error.requestId);
});

test('GET /api/health reports database state', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.ok([200, 503].includes(response.status));
  assert.ok(['ok', 'degraded'].includes(body.status));
  assert.ok(body.dependencies.database.status);
});

test('protected worker routes require a Bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/workers`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('attempt submissions require a Bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/attempts/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('attempt submissions validate evidence before reaching the database', async () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'admin@example.com',
    role: 'admin',
  });
  const response = await fetch(`${baseUrl}/api/attempts/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: '{}',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.some((detail) => detail.field === 'attemptId'));
});

test('certificate management requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/certificates`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('certificate issuance requires a future expiry and valid attempt ID', async () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'admin@example.com',
    role: 'admin',
  });
  const response = await fetch(`${baseUrl}/api/certificates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ attemptId: 'bad', expiresAt: '2020-01-01T00:00:00Z' }),
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.details.length, 2);
});

test('only administrators can revoke certificates', async () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'officer@example.com',
    role: 'safety_officer',
  });
  const response = await fetch(
    `${baseUrl}/api/certificates/7ff03331-8b53-43c8-af38-9ac67b30e13a/status`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'revoked', reason: 'Testing role protection' }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('result routes validate attempt identifiers after authentication', async () => {
  const token = signAccessToken({
    id: '87c16c44-4efd-4a9f-ac47-48ae83727125',
    email: 'admin@example.com',
    role: 'admin',
  });
  const response = await fetch(`${baseUrl}/api/results/not-a-uuid`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_ATTEMPT_ID');
});

test('login validates the request before querying the database', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid', password: 'short' }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.equal(body.error.details.length, 2);
});

test('worker login requires an employee code and numeric PIN', async () => {
  const response = await fetch(`${baseUrl}/api/auth/worker-login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employeeCode: '', pin: 'abc' }),
  });
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.some((detail) => detail.field === 'employeeCode'));
  assert.ok(body.error.details.some((detail) => detail.field === 'pin'));
});

test('worker tokens cannot submit attempts for another worker', async () => {
  const workerId = '87c16c44-4efd-4a9f-ac47-48ae83727125';
  const otherWorkerId = '97c16c44-4efd-4a9f-ac47-48ae83727126';
  const token = signAccessToken({ id: workerId, employeeCode: 'JH-1001', role: 'worker' });
  const now = new Date().toISOString();
  const response = await fetch(`${baseUrl}/api/attempts/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      attemptId: '77c16c44-4efd-4a9f-ac47-48ae83727127',
      workerId: otherWorkerId,
      moduleId: 'fire-response', moduleVersion: 1, scoringVersion: 1,
      languageCode: 'en', startedAt: now, completedAt: now,
      actions: [{ stepId: 'identify_exit', selectedValue: 'safe-exit', occurredAt: now, sequenceNumber: 0 }],
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'WORKER_ATTEMPT_FORBIDDEN');
});
