const resultService = require('../services/result.service');

async function listResults(request, response) {
  const result = await resultService.listResults(request.query);
  response.status(200).json(result);
}

async function getResult(request, response) {
  const data = await resultService.getResult(request.params.attemptId);
  response.status(200).json({ data });
}

module.exports = { listResults, getResult };
