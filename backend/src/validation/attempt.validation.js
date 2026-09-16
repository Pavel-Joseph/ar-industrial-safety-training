const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MODULE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,79}$/;
const STEP_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,79}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const LANGUAGES = new Set(['en', 'hi', 'sat']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseTimestamp(value) {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) {
    return null;
  }
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  const timestamp = new Date(value);
  return Number.isFinite(timestamp.getTime()) ? timestamp : null;
}

function validateAttempt(body) {
  const errors = [];
  if (!isObject(body)) {
    return { valid: false, errors: [{ field: 'body', message: 'A JSON object is required' }] };
  }

  if (typeof body.attemptId !== 'string' || !UUID_PATTERN.test(body.attemptId)) {
    errors.push({ field: 'attemptId', message: 'A UUID is required' });
  }
  if (typeof body.workerId !== 'string' || !UUID_PATTERN.test(body.workerId)) {
    errors.push({ field: 'workerId', message: 'A UUID is required' });
  }
  if (typeof body.moduleId !== 'string' || !MODULE_ID_PATTERN.test(body.moduleId)) {
    errors.push({ field: 'moduleId', message: 'A valid module ID is required' });
  }
  for (const field of ['moduleVersion', 'scoringVersion']) {
    if (!Number.isSafeInteger(body[field]) || body[field] < 1) {
      errors.push({ field, message: 'A positive integer is required' });
    }
  }
  if (!LANGUAGES.has(body.languageCode)) {
    errors.push({ field: 'languageCode', message: 'Language must be en, hi or sat' });
  }

  const startedAt = parseTimestamp(body.startedAt);
  const completedAt = parseTimestamp(body.completedAt);
  if (!startedAt) {
    errors.push({ field: 'startedAt', message: 'An ISO 8601 timestamp with timezone is required' });
  }
  if (!completedAt) {
    errors.push({ field: 'completedAt', message: 'An ISO 8601 timestamp with timezone is required' });
  }
  if (startedAt && completedAt && completedAt < startedAt) {
    errors.push({ field: 'completedAt', message: 'Completion must follow the start' });
  }
  if (completedAt && completedAt.getTime() > Date.now() + 5 * 60_000) {
    errors.push({ field: 'completedAt', message: 'Completion cannot be more than five minutes in the future' });
  }

  const deviceMetadata = body.deviceMetadata === undefined ? {} : body.deviceMetadata;
  if (!isObject(deviceMetadata) || JSON.stringify(deviceMetadata).length > 4096) {
    errors.push({ field: 'deviceMetadata', message: 'A JSON object of at most 4096 characters is required' });
  }

  const actions = [];
  if (!Array.isArray(body.actions) || body.actions.length < 1 || body.actions.length > 100) {
    errors.push({ field: 'actions', message: 'Provide 1 to 100 actions' });
  } else {
    const seenSteps = new Set();
    let previousTime = startedAt?.getTime() ?? -Infinity;
    for (const [index, action] of body.actions.entries()) {
      if (!isObject(action)) {
        errors.push({ field: `actions[${index}]`, message: 'An action object is required' });
        continue;
      }
      if (typeof action.stepId !== 'string' || !STEP_ID_PATTERN.test(action.stepId)) {
        errors.push({ field: `actions[${index}].stepId`, message: 'A valid step ID is required' });
      } else if (seenSteps.has(action.stepId)) {
        errors.push({ field: `actions[${index}].stepId`, message: 'Each step can appear once' });
      } else {
        seenSteps.add(action.stepId);
      }
      if (!Object.hasOwn(action, 'selectedValue') || JSON.stringify(action.selectedValue) === undefined) {
        errors.push({ field: `actions[${index}].selectedValue`, message: 'A JSON value is required' });
      }
      if (action.sequenceNumber !== index) {
        errors.push({ field: `actions[${index}].sequenceNumber`, message: 'Sequence numbers must start at 0 and follow array order' });
      }
      const occurredAt = parseTimestamp(action.occurredAt);
      if (!occurredAt) {
        errors.push({ field: `actions[${index}].occurredAt`, message: 'An ISO 8601 timestamp with timezone is required' });
      } else {
        const time = occurredAt.getTime();
        if (time < previousTime || (completedAt && time > completedAt.getTime())) {
          errors.push({ field: `actions[${index}].occurredAt`, message: 'Actions must occur in sequence during the attempt' });
        }
        previousTime = time;
      }
      actions.push({
        stepId: action.stepId,
        selectedValue: action.selectedValue,
        occurredAt: occurredAt?.toISOString(),
        sequenceNumber: action.sequenceNumber,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? {
      attemptId: body.attemptId.toLowerCase(),
      workerId: body.workerId.toLowerCase(),
      moduleId: body.moduleId,
      moduleVersion: body.moduleVersion,
      scoringVersion: body.scoringVersion,
      languageCode: body.languageCode,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      deviceMetadata,
      actions,
    } : undefined,
  };
}

module.exports = { validateAttempt };
