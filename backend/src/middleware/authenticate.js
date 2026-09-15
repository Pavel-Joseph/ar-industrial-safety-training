const { verifyAccessToken } = require('../services/token.service');
const { AppError } = require('../utils/app-error');

function authenticate(request, _response, next) {
  const authorization = request.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(
      new AppError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer access token is required'),
    );
  }

  try {
    request.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate };
