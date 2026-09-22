const express = require('express');

const authController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate-body');
const { validateLogin, validateWorkerLogin } = require('../validation/auth.validation');

const router = express.Router();

router.post('/login', validateBody(validateLogin), authController.login);
router.post('/worker-login', validateBody(validateWorkerLogin), authController.workerLogin);

module.exports = { authRouter: router };
