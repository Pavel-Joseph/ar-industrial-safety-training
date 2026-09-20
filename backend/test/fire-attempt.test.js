'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { assess, createServer } = require('../server');

function sample() {
  const keys = ['scenario_placed', 'exit_identified', 'extinguisher_selected',
    'aim_selected', 'spray_completed', 'evacuation_started', 'evac_exit',
    'assembly_reached'];
  return {
    attemptId: '0123456789abcdef0123456789abcdef', workerId: 'demo-worker-001',
    moduleId: 'fire-response', scoringVersion: 'fire-v1',
    completedAtUtc: new Date().toISOString(), totalDurationSeconds: 25,
    score: 100, passed: true, incorrectSelections: 0,
    identificationScore: 100, identificationDurationSeconds: 9,
    evacuationDurationSeconds: 6, sprayPracticeCompleted: true,
    syncState: 'pending',
    events: keys.map((key, index) => ({ key, correct: true, elapsedSeconds: index * 3 }))
  };
}

test('assessment enforces order and recomputes score', () => {
  assert.deepEqual(assess(sample()), { score: 100, passed: true });
  const wrongOrder = sample();
  [wrongOrder.events[1], wrongOrder.events[2]] =
    [wrongOrder.events[2], wrongOrder.events[1]];
  assert.match(assess(wrongOrder).error, /out of order/);
  const mistake = sample();
  mistake.events.splice(2, 0, { key: 'wrong_extinguisher', correct: false,
    elapsedSeconds: 4 });
  assert.match(assess(mistake).error, /does not match/);
  mistake.score = 90;
  mistake.incorrectSelections = 1;
  assert.deepEqual(assess(mistake), { score: 90, passed: true });
});

test('API persists one attempt and acknowledges duplicate retries', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fire-api-'));
  const file = path.join(dir, 'attempts.json');
  const server = createServer(file);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/attempts`;
    const send = () => fetch(url, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample()) });
    const first = await send();
    assert.equal(first.status, 201);
    assert.equal((await first.json()).accepted, true);
    const duplicate = await send();
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).duplicate, true);
    assert.equal(JSON.parse(fs.readFileSync(file)).length, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
