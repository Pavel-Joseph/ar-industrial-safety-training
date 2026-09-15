const express = require('express');

const authController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/validate-body');
const { validateLogin } = require('../validation/auth.validation');

const router = express.Router();

router.post('/login', validateBody(validateLogin), authController.login);

module.exports = { authRouter: router };
