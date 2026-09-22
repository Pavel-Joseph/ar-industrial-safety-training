const LANGUAGES = new Set(['en', 'hi', 'sat']);

function validateCreateWorker(body) {
  const errors = [];
  const employeeCode =
    typeof body?.employeeCode === 'string' ? body.employeeCode.trim().toUpperCase() : '';
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const preferredLanguage =
    typeof body?.preferredLanguage === 'string'
      ? body.preferredLanguage.trim().toLowerCase()
      : 'en';
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

  if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(employeeCode)) {
    errors.push({
      field: 'employeeCode',
      message: 'Employee code must contain 2 to 50 letters, numbers, underscores or hyphens',
    });
  }
  if (fullName.length < 2 || fullName.length > 120) {
    errors.push({ field: 'fullName', message: 'Full name must contain 2 to 120 characters' });
  }
  if (!LANGUAGES.has(preferredLanguage)) {
    errors.push({ field: 'preferredLanguage', message: 'Language must be en, hi or sat' });
  }
  if (!/^\d{4,8}$/.test(pin)) {
    errors.push({ field: 'pin', message: 'PIN must contain 4 to 8 digits' });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: { employeeCode, fullName, preferredLanguage, pin },
  };
}

function validateWorkerPin(body) {
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';
  const errors = /^\d{4,8}$/.test(pin)
    ? [] : [{ field: 'pin', message: 'PIN must contain 4 to 8 digits' }];
  return { valid: errors.length === 0, errors, value: { pin } };
}

module.exports = { validateCreateWorker, validateWorkerPin };
