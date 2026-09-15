function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const isInvalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const status = isInvalidJson ? 400 : Number.isInteger(error.status) ? error.status : 500;
  const code = isInvalidJson ? 'INVALID_JSON' : error.code || 'INTERNAL_SERVER_ERROR';
  const message =
    status >= 500
      ? 'An unexpected error occurred'
      : isInvalidJson
        ? 'The request body contains invalid JSON'
        : error.message;

  if (status >= 500) {
    console.error(`[${request.id}] Unhandled request error`, error);
  }

  response.status(status).json({
    error: {
      code,
      message,
      requestId: request.id,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

module.exports = { errorHandler };
