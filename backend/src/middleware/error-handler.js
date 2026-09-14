function errorHandler(error, request, response, next) {
  console.error(`[${request.id}] Unhandled request error`, error);

  if (response.headersSent) {
    return next(error);
  }

  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId: request.id,
    },
  });
}

module.exports = { errorHandler };
