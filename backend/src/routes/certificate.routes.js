const express = require('express');

const certificateController = require('../controllers/certificate.controller');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validateBody } = require('../middleware/validate-body');
const {
  validateIssueCertificate,
  validateRevokeCertificate,
} = require('../validation/certificate.validation');

const certificateRouter = express.Router();
certificateRouter.use(authenticate, authorize('admin', 'safety_officer'));
certificateRouter.use((_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
certificateRouter.get('/', certificateController.listCertificates);
certificateRouter.post('/', validateBody(validateIssueCertificate), certificateController.issueCertificate);
certificateRouter.get('/:certificateId/qr.svg', certificateController.certificateQr);
certificateRouter.get('/:certificateId/document.html', certificateController.certificateDocument);
certificateRouter.get('/:certificateId', certificateController.getCertificate);
certificateRouter.patch(
  '/:certificateId/status',
  authorize('admin'),
  validateBody(validateRevokeCertificate),
  certificateController.revokeCertificate,
);

const verificationApiRouter = express.Router();
verificationApiRouter.get('/:publicId', certificateController.verifyCertificate);

const verificationPageRouter = express.Router();
verificationPageRouter.get('/:publicId', certificateController.verificationPage);

module.exports = { certificateRouter, verificationApiRouter, verificationPageRouter };
