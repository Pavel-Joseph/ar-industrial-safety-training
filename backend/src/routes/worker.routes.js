const express = require('express');

const workerController = require('../controllers/worker.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate-body');
const { validateCreateWorker } = require('../validation/worker.validation');

const router = express.Router();

router.use(authenticate, authorize('admin', 'safety_officer'));
router.get('/', workerController.listWorkers);
router.post('/', validateBody(validateCreateWorker), workerController.createWorker);
router.get('/:workerId', workerController.getWorker);

module.exports = { workerRouter: router };
