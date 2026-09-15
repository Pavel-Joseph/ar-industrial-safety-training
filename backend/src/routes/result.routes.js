const express = require('express');

const resultController = require('../controllers/result.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'safety_officer'));
router.get('/', resultController.listResults);
router.get('/:attemptId', resultController.getResult);

module.exports = { resultRouter: router };
