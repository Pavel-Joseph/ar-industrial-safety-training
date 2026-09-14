const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { createApp } = require('../src/app');
const { closeDatabase } = require('../src/config/database');

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
