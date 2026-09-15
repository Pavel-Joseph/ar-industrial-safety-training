const moduleService = require('../services/module.service');

async function listModules(_request, response) {
  const data = await moduleService.listModules();
  response.status(200).json({ data });
}

async function getModule(request, response) {
  const data = await moduleService.getModule(request.params.moduleId);
  response.status(200).json({ data });
}

module.exports = { listModules, getModule };
