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

module.exports = { validateLogin };
