const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { after, test } = require('node:test');

const { createApp } = require('../src/app');
const { closeDatabase, pool } = require('../src/config/database');
const { env } = require('../src/config/env');

after(closeDatabase);

test('passing attempts can be issued, verified, expired and revoked', {
  skip: process.env.RUN_DB_TESTS !== '1' && 'Set RUN_DB_TESTS=1 after migrating and seeding',
}, async () => {
  const worker = await pool.query(
    `INSERT INTO workers (employee_code, full_name, preferred_language)
     VALUES ($1, 'Certificate Test Worker', 'hi') RETURNING id`,
    [`CERT-${randomUUID()}`],
  );
  const workerId = worker.rows[0].id;
  const attemptIds = [randomUUID(), randomUUID(), randomUUID()];
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const completedAt = new Date().toISOString();
  const actions = [
    { stepId: 'identify_exit', selectedValue: 'safe-exit', occurredAt: startedAt, sequenceNumber: 0 },
    { stepId: 'extinguisher_use', selectedValue: 'correct-sequence', occurredAt: startedAt, sequenceNumber: 1 },
    { stepId: 'evacuation_sequence', selectedValue: 'assembly-point', occurredAt: completedAt, sequenceNumber: 2 },
  ];

  try {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: env.demoAdminEmail, password: env.demoAdminPassword }),
    });
    assert.equal(login.status, 200);
    const loginBody = await login.json();
    const headers = {
      authorization: `Bearer ${loginBody.data.accessToken}`,
      'content-type': 'application/json',
    };
    const post = (path, body) => fetch(`${baseUrl}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    const attempt = (attemptId, selectedActions) => ({
      attemptId, workerId, moduleId: 'fire-response', moduleVersion: 1,
      scoringVersion: 1, languageCode: 'hi', startedAt, completedAt,
      deviceMetadata: { platform: 'test' }, actions: selectedActions,
    });
    for (const [index, selectedActions] of [
      actions,
      [{ ...actions[0], selectedValue: 'wrong-exit' }, ...actions.slice(1)],
      actions,
    ].entries()) {
      const response = await post('/api/attempts/sync', attempt(attemptIds[index], selectedActions));
      assert.equal(response.status, 201, await response.text());
    }

    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const issueBody = { attemptId: attemptIds[0], expiresAt };
    const issued = await post('/api/certificates', issueBody);
    assert.equal(issued.status, 201);
    const certificate = (await issued.json()).data;
    assert.equal(certificate.status, 'valid');
    assert.match(certificate.disclaimer, /not a certificate issued/);
    const retriedAttempt = await post('/api/attempts/sync', attempt(attemptIds[0], actions));
    assert.equal(retriedAttempt.status, 200);
    assert.equal((await retriedAttempt.json()).data.certificateStatus, 'valid');

    const duplicate = await post('/api/certificates', issueBody);
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).data.id, certificate.id);

    const failed = await post('/api/certificates', { attemptId: attemptIds[1], expiresAt });
    assert.equal(failed.status, 409);
    assert.equal((await failed.json()).error.code, 'NOT_ELIGIBLE');

    const verification = await fetch(`${baseUrl}/api/verify/${certificate.publicId}`);
    const publicData = (await verification.json()).data;
    assert.equal(verification.status, 200);
    assert.equal(publicData.valid, true);
    assert.equal(publicData.workerName, 'Certificate Test Worker');
    assert.equal(publicData.employeeCode, undefined);

    const page = await fetch(`${baseUrl}/verify/${certificate.publicId}`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Valid training record/);
    const qr = await fetch(`${baseUrl}${certificate.qrSvgUrl}`, { headers });
    assert.equal(qr.status, 200);
    assert.match(qr.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await qr.text(), /^<svg /);
    const document = await fetch(
      `${baseUrl}${certificate.documentHtmlUrl}`,
      { headers },
    );
    assert.equal(document.status, 200);
    const documentHtml = await document.text();
    assert.match(documentHtml, /Training Completion Record/);
    assert.match(documentHtml, /<svg /);
    assert.match(documentHtml, /not a certificate issued/);

    const list = await fetch(`${baseUrl}/api/certificates?workerId=${workerId}`, { headers });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).meta.total, 1);

    const revoke = await fetch(`${baseUrl}/api/certificates/${certificate.id}/status`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ status: 'revoked', reason: 'Test revocation' }),
    });
    assert.equal(revoke.status, 200);
    assert.equal((await revoke.json()).data.status, 'revoked');
    const afterRevocation = await fetch(`${baseUrl}/api/verify/${certificate.publicId}`);
    assert.equal((await afterRevocation.json()).data.valid, false);
    const retriedAfterRevocation = await post('/api/attempts/sync', attempt(attemptIds[0], actions));
    assert.equal((await retriedAfterRevocation.json()).data.certificateStatus, 'revoked');

    const expiring = await post('/api/certificates', { attemptId: attemptIds[2], expiresAt });
    assert.equal(expiring.status, 201);
    const expiringCertificate = (await expiring.json()).data;
    await pool.query(
      'UPDATE certificates SET expires_at = NOW() - INTERVAL \'1 minute\' WHERE id = $1',
      [expiringCertificate.id],
    );
    const expired = await fetch(`${baseUrl}/api/verify/${expiringCertificate.publicId}`);
    const expiredData = (await expired.json()).data;
    assert.equal(expiredData.status, 'expired');
    assert.equal(expiredData.valid, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.query(
      `DELETE FROM certificates WHERE training_attempt_id IN (
         SELECT id FROM training_attempts WHERE worker_id = $1)`,
      [workerId],
    );
    await pool.query('DELETE FROM training_attempts WHERE worker_id = $1', [workerId]);
    await pool.query('DELETE FROM workers WHERE id = $1', [workerId]);
  }
});
