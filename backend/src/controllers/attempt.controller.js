const attemptService = require('../services/attempt.service');

async function syncAttempt(request, response) {
  const result = await attemptService.submitAttempt(request.validatedBody);
  response.status(result.created ? 201 : 200).json({ data: result.data });
}

module.exports = { syncAttempt };
