function notFound(request, response) {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route matches ${request.method} ${request.originalUrl}`,
      requestId: request.id,
    },
  });
}

module.exports = { notFound };
