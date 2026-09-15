const { AppError } = require('../utils/app-error');

function authorize(...allowedRoles) {
  return function authorizeRole(request, _response, next) {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(
        new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'),
      );
    }

    return next();
  };
}

module.exports = { authorize };
