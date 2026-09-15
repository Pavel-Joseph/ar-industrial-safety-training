const authService = require('../services/auth.service');

async function login(request, response) {
  const data = await authService.login(request.validatedBody);
  response.status(200).json({ data });
}

module.exports = { login };
