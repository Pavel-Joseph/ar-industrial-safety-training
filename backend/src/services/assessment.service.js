const { isDeepStrictEqual } = require('node:util');

const { AppError } = require('../utils/app-error');

function evaluateAssessment(rules, actions, passMark) {
  if (!rules.length) {
    throw new AppError(409, 'RULES_NOT_CONFIGURED', 'No scoring rules are configured for this module version');
  }

  const ruleByStep = new Map(rules.map((rule) => [rule.step_id, rule]));
  for (const action of actions) {
    if (!ruleByStep.has(action.stepId)) {
      throw new AppError(422, 'UNKNOWN_STEP', `Unknown assessment step: ${action.stepId}`);
    }
  }

  const actionByStep = new Map(actions.map((action) => [action.stepId, action]));
  let totalCents = 0;
  let maximumCents = 0;
  let requiredComplete = true;
  let criticalPassed = true;
  const steps = [];

  for (const rule of rules) {
    const maximumScore = Number(rule.maximum_score);
    const maximumScoreCents = Math.round(maximumScore * 100);
    if (!Number.isFinite(maximumScore) || maximumScoreCents < 0 || rule.correct_value === null) {
      throw new AppError(409, 'INVALID_RULES', 'Scoring rules need a maximum score and correct value');
    }
    const action = actionByStep.get(rule.step_id);
    const correct = Boolean(action && isDeepStrictEqual(action.selectedValue, rule.correct_value));
    const earnedCents = correct ? maximumScoreCents : 0;
    totalCents += earnedCents;
    maximumCents += maximumScoreCents;
    if (rule.required && !action) requiredComplete = false;
    if (rule.critical && !correct) criticalPassed = false;
    steps.push({
      stepId: rule.step_id,
      correct,
      earnedScore: earnedCents / 100,
      maximumScore: maximumScoreCents / 100,
      required: rule.required,
      critical: rule.critical,
    });
  }

  if (maximumCents <= 0 || !Number.isFinite(passMark) || passMark < 0 || passMark > 100) {
    throw new AppError(409, 'INVALID_RULES', 'Scoring rules must have a positive maximum and valid pass mark');
  }

  const percentage = Math.round((totalCents / maximumCents) * 10_000) / 100;
  return {
    totalScore: totalCents / 100,
    maximumScore: maximumCents / 100,
    percentage,
    passed: (totalCents / maximumCents) * 100 >= passMark && requiredComplete && criticalPassed,
    details: { passMark, requiredComplete, criticalPassed, steps },
  };
}

module.exports = { evaluateAssessment };
