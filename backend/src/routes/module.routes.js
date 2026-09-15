const express = require('express');

const moduleController = require('../controllers/module.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin', 'safety_officer'));
router.get('/', moduleController.listModules);
router.get('/:moduleId', moduleController.getModule);

module.exports = { moduleRouter: router };
