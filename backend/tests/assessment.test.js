const assert = require('node:assert/strict');
const { test } = require('node:test');

const { evaluateAssessment } = require('../src/services/assessment.service');
const { validateAttempt } = require('../src/validation/attempt.validation');

const rules = [
  { step_id: 'identify_exit', maximum_score: '20.00', correct_value: 'safe-exit', required: true, critical: true },
  { step_id: 'extinguisher_use', maximum_score: '30.00', correct_value: 'correct-sequence', required: true, critical: false },
  { step_id: 'evacuation_sequence', maximum_score: '50.00', correct_value: 'assembly-point', required: true, critical: true },
];

const actions = [
  { stepId: 'identify_exit', selectedValue: 'safe-exit' },
  { stepId: 'extinguisher_use', selectedValue: 'correct-sequence' },
  { stepId: 'evacuation_sequence', selectedValue: 'assembly-point' },
];

test('all correct actions pass and preserve a step breakdown', () => {
  const score = evaluateAssessment(rules, actions, 70);
  assert.deepEqual(
    [score.totalScore, score.maximumScore, score.percentage, score.passed],
    [100, 100, 100, true],
  );
  assert.equal(score.details.steps.length, 3);
});

test('a wrong critical step fails even when the percentage exceeds the pass mark', () => {
  const score = evaluateAssessment(
    rules,
    [{ ...actions[0], selectedValue: 'wrong-exit' }, ...actions.slice(1)],
    70,
  );
  assert.equal(score.percentage, 80);
  assert.equal(score.passed, false);
  assert.equal(score.details.criticalPassed, false);
});

test('missing required steps produce a failed result', () => {
  const score = evaluateAssessment(rules, actions.slice(1), 70);
  assert.equal(score.percentage, 80);
  assert.equal(score.passed, false);
  assert.equal(score.details.requiredComplete, false);
});

test('a noncritical mistake can still pass at the configured mark', () => {
  const score = evaluateAssessment(
    rules,
    [actions[0], { ...actions[1], selectedValue: 'wrong-sequence' }, actions[2]],
    70,
  );
  assert.equal(score.percentage, 70);
  assert.equal(score.passed, true);
});

test('unknown steps are rejected instead of silently ignored', () => {
  assert.throws(
    () => evaluateAssessment(rules, [{ stepId: 'unknown', selectedValue: true }], 70),
    { code: 'UNKNOWN_STEP' },
  );
});

test('attempt validation rejects duplicate and out-of-order actions', () => {
  const body = {
    attemptId: '7ff03331-8b53-43c8-af38-9ac67b30e13a',
    workerId: 'c0d6309f-3956-48ee-ad90-264de676e917',
    moduleId: 'fire-response',
    moduleVersion: 1,
    scoringVersion: 1,
    languageCode: 'hi',
    startedAt: '2026-09-14T08:30:00.000Z',
    completedAt: '2026-09-14T08:38:00.000Z',
    actions: [
      { stepId: 'identify_exit', selectedValue: 'safe-exit', occurredAt: '2026-09-14T08:31:00.000Z', sequenceNumber: 0 },
      { stepId: 'identify_exit', selectedValue: 'safe-exit', occurredAt: '2026-09-14T08:32:00.000Z', sequenceNumber: 2 },
    ],
  };
  const result = validateAttempt(body);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.field.endsWith('stepId')));
  assert.ok(result.errors.some((error) => error.field.endsWith('sequenceNumber')));
});
