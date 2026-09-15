const workerService = require('../services/worker.service');

async function listWorkers(request, response) {
  const result = await workerService.listWorkers(request.query);
  response.status(200).json(result);
}

async function getWorker(request, response) {
  const data = await workerService.getWorker(request.params.workerId);
  response.status(200).json({ data });
}

async function createWorker(request, response) {
  const data = await workerService.createWorker(request.validatedBody);
  response.status(201).json({ data });
}

module.exports = { listWorkers, getWorker, createWorker };
