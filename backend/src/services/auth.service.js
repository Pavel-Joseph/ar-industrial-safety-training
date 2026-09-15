const { query } = require('../config/database');
const { env } = require('../config/env');
const { AppError } = require('../utils/app-error');
const { verifyPassword } = require('./password.service');
const { signAccessToken } = require('./token.service');

async function login({ email, password }) {
  const result = await query(
    `SELECT id, email, password_hash, role
       FROM users
      WHERE email = $1`,
    [email],
  );

  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [
    user.id,
  ]);

  return {
    accessToken: signAccessToken(user),
    tokenType: 'Bearer',
    expiresIn: env.jwtExpiresInSeconds,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = { login };
