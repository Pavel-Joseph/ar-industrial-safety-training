const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, test } = require('node:test');

const { createApp } = require('../src/app');
const { closeDatabase, pool } = require('../src/config/database');
const { signAccessToken } = require('../src/services/token.service');

after(closeDatabase);

test('attempt submission persists a score and is idempotent', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Set RUN_DB_TESTS=1 after migrating and seeding',
}, async () => {
  const employeeCode = `TEST-${randomUUID()}`;
  const worker = await pool.query(
    `INSERT INTO workers (employee_code, full_name, preferred_language)
     VALUES ($1, 'Assessment Test Worker', 'hi') RETURNING id`,
    [employeeCode],
  );
  const workerId = worker.rows[0].id;
  const attemptId = randomUUID();
  const failingAttemptId = randomUUID();
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = signAccessToken({ id: randomUUID(), email: 'test@example.com', role: 'admin' });
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const completedAt = new Date().toISOString();
  const payload = {
    attemptId,
    workerId,
    moduleId: 'fire-response',
    moduleVersion: 1,
    scoringVersion: 1,
    languageCode: 'hi',
    startedAt,
    completedAt,
    deviceMetadata: { platform: 'Android' },
    actions: [
      { stepId: 'identify_exit', selectedValue: 'safe-exit', occurredAt: startedAt, sequenceNumber: 0 },
      { stepId: 'extinguisher_use', selectedValue: 'correct-sequence', occurredAt: startedAt, sequenceNumber: 1 },
      { stepId: 'evacuation_sequence', selectedValue: 'assembly-point', occurredAt: completedAt, sequenceNumber: 2 },
    ],
  };

  try {
    const submit = (body) => fetch(`${baseUrl}/api/attempts/sync`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    const first = await submit(payload);
    assert.equal(first.status, 201, await first.text());

    const retry = await submit(payload);
    const retryBody = await retry.json();
    assert.equal(retry.status, 200);
    assert.equal(retryBody.data.syncStatus, 'already-accepted');
    assert.equal(retryBody.data.score.passed, true);

    const conflicting = await submit({ ...payload, actions: [
      { ...payload.actions[0], selectedValue: 'wrong-exit' }, ...payload.actions.slice(1),
    ] });
    assert.equal(conflicting.status, 409);
    assert.equal((await conflicting.json()).error.code, 'ATTEMPT_ID_CONFLICT');

    const failed = await submit({
      ...payload,
      attemptId: failingAttemptId,
      actions: [{ ...payload.actions[0], selectedValue: 'wrong-exit' }, ...payload.actions.slice(1)],
    });
    assert.equal(failed.status, 201, await failed.text());
    const failedResult = await fetch(`${baseUrl}/api/results/${failingAttemptId}`, { headers });
    const failedBody = await failedResult.json();
    assert.equal(failedBody.data.score.percentage, 80);
    assert.equal(failedBody.data.score.passed, false);

    const counts = await pool.query(
      `SELECT COUNT(*)::integer AS attempts,
              (SELECT COUNT(*)::integer FROM attempt_actions aa
                JOIN training_attempts ta2 ON ta2.id = aa.training_attempt_id
               WHERE ta2.worker_id = $1) AS actions
         FROM training_attempts WHERE worker_id = $1`,
      [workerId],
    );
    assert.equal(counts.rows[0].attempts, 2);
    assert.equal(counts.rows[0].actions, 6);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM training_attempts WHERE worker_id = $1', [workerId]);
    await pool.query('DELETE FROM workers WHERE id = $1', [workerId]);
  }
});
