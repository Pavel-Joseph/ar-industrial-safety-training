function validateLogin(body) {
  const errors = [];
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }
  if (password.length < 8 || password.length > 1024) {
    errors.push({ field: 'password', message: 'Password must contain 8 to 1024 characters' });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: { email, password },
  };
}

function validateWorkerLogin(body) {
  const errors = [];
  const employeeCode =
    typeof body?.employeeCode === 'string' ? body.employeeCode.trim().toUpperCase() : '';
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : '';

  if (!/^[A-Z0-9][A-Z0-9_-]{1,49}$/.test(employeeCode)) {
    errors.push({ field: 'employeeCode', message: 'Enter a valid employee code' });
  }
  if (!/^\d{4,8}$/.test(pin)) {
    errors.push({ field: 'pin', message: 'PIN must contain 4 to 8 digits' });
  }

  return { valid: errors.length === 0, errors, value: { employeeCode, pin } };
}

module.exports = { validateLogin, validateWorkerLogin };
