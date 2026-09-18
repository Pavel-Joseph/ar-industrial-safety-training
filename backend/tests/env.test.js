const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { test } = require('node:test');

function loadConfig(overrides) {
  return spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write(require("./src/config/env").env.publicBaseUrl)'],
    {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: 'x'.repeat(32),
        PUBLIC_BASE_URL: '',
        RENDER_EXTERNAL_URL: '',
        ...overrides,
      },
    },
  );
}

test('production uses the Render HTTPS URL when PUBLIC_BASE_URL is empty', () => {
  const result = loadConfig({ RENDER_EXTERNAL_URL: 'https://example.onrender.com' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.trim().endsWith('https://example.onrender.com'));
});

test('an explicit PUBLIC_BASE_URL takes precedence over the Render URL', () => {
  const result = loadConfig({
    PUBLIC_BASE_URL: 'https://api.example.com',
    RENDER_EXTERNAL_URL: 'https://example.onrender.com',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.trim().endsWith('https://api.example.com'));
});

test('production still rejects an explicit HTTP PUBLIC_BASE_URL', () => {
  const result = loadConfig({
    PUBLIC_BASE_URL: 'http://localhost:3000',
    RENDER_EXTERNAL_URL: 'https://example.onrender.com',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PUBLIC_BASE_URL must use HTTPS in production/);
});
