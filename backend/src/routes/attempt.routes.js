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
  authorize('admin', 'safety_officer', 'worker'),
  validateBody(validateAttempt),
  (request, _response, next) => {
    if (request.auth.role === 'worker' && request.auth.sub !== request.validatedBody.workerId) {
      const { AppError } = require('../utils/app-error');
      return next(new AppError(403, 'WORKER_ATTEMPT_FORBIDDEN',
        'Workers may submit attempts only for their own account'));
    }
    return next();
  },
  attemptController.syncAttempt,
);

module.exports = { attemptRouter: router };
