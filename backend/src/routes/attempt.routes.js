const express = require('express');

const attemptController = require('../controllers/attempt.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate-body');
const { validateAttempt } = require('../validation/attempt.validation');

const router = express.Router();

router.post(
  '/sync',
  authenticate,
  authorize('admin', 'safety_officer'),
  validateBody(validateAttempt),
  attemptController.syncAttempt,
);

module.exports = { attemptRouter: router };
