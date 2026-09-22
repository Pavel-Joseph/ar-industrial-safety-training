const express = require('express');

const workerController = require('../controllers/worker.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate-body');
const { validateCreateWorker, validateWorkerPin } = require('../validation/worker.validation');

const router = express.Router();

router.use(authenticate, authorize('admin', 'safety_officer'));
router.get('/', workerController.listWorkers);
router.post('/', validateBody(validateCreateWorker), workerController.createWorker);
router.patch('/:workerId/pin', authorize('admin'), validateBody(validateWorkerPin), workerController.setWorkerPin);
router.get('/:workerId', workerController.getWorker);

module.exports = { workerRouter: router };
