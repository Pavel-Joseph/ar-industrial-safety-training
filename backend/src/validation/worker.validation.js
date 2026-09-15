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

  return {
    valid: errors.length === 0,
    errors,
    value: { employeeCode, fullName, preferredLanguage },
  };
}

module.exports = { validateCreateWorker };
