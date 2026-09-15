const { AppError } = require('../utils/app-error');

function validateBody(validator) {
  return function validateRequestBody(request, _response, next) {
    const result = validator(request.body);
    if (!result.valid) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'The request body is invalid', result.errors),
      );
    }

    request.validatedBody = result.value;
    return next();
  };
}

module.exports = { validateBody };
