const certificateService = require('../services/certificate.service');
const { qrSvg } = require('../services/qr.service');

async function issueCertificate(request, response) {
  const result = await certificateService.issueCertificate(request.validatedBody, request.auth.sub);
  response.status(result.created ? 201 : 200).json({ data: result.data });
}

async function listCertificates(request, response) {
  const result = await certificateService.listCertificates(request.query);
  response.status(200).json(result);
}

async function getCertificate(request, response) {
  const data = await certificateService.getCertificate(request.params.certificateId);
  response.status(200).json({ data });
}

async function certificateQr(request, response) {
  const certificate = await certificateService.getCertificate(request.params.certificateId);
  response.set('Cache-Control', 'no-store');
  response.type('image/svg+xml').status(200).send(qrSvg(certificate.verificationUrl));
}

async function certificateDocument(request, response) {
  const certificate = await certificateService.getCertificate(request.params.certificateId);
  const status = certificate.status.toUpperCase();
  response.set('Cache-Control', 'no-store');
  response.type('html').status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Training completion record · ${escapeHtml(certificate.worker.fullName)}</title></head><body>
<main><h1>Training Completion Record</h1><p><strong>Prototype certificate · ${escapeHtml(status)}</strong></p>
<p>${escapeHtml(certificate.disclaimer)}</p>
<dl><dt>Worker</dt><dd>${escapeHtml(certificate.worker.fullName)}</dd>
<dt>Employee code</dt><dd>${escapeHtml(certificate.worker.employeeCode)}</dd>
<dt>Training module</dt><dd>${escapeHtml(certificate.module.name)}</dd>
<dt>Score</dt><dd>${escapeHtml(certificate.score.percentage)}%</dd>
<dt>Issued</dt><dd>${escapeHtml(certificate.issuedAt.toISOString())}</dd>
<dt>Expires</dt><dd>${escapeHtml(certificate.expiresAt?.toISOString() || 'Not set')}</dd>
<dt>Certificate ID</dt><dd>${escapeHtml(certificate.id)}</dd></dl>
<figure>${qrSvg(certificate.verificationUrl)}<figcaption>Scan to check current status: ${escapeHtml(certificate.verificationUrl)}</figcaption></figure>
</main></body></html>`);
}

async function revokeCertificate(request, response) {
  const data = await certificateService.revokeCertificate(
    request.params.certificateId,
    request.validatedBody.reason,
    request.auth.sub,
  );
  response.status(200).json({ data });
}

async function verifyCertificate(request, response) {
  const data = await certificateService.verifyCertificate(request.params.publicId);
  response.set('Cache-Control', 'no-store');
  response.status(200).json({ data });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

async function verificationPage(request, response) {
  const data = await certificateService.verifyCertificate(request.params.publicId);
  const status = data.valid ? 'Valid training record' : `Certificate ${data.status}`;
  response.set('Cache-Control', 'no-store');
  response.type('html').status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(status)} · AR Safety Training</title></head><body>
<main><h1>${escapeHtml(status)}</h1>
<p>${escapeHtml(data.disclaimer)}</p>
<dl><dt>Worker</dt><dd>${escapeHtml(data.workerName)}</dd>
<dt>Training module</dt><dd>${escapeHtml(data.moduleName)}</dd>
<dt>Score</dt><dd>${escapeHtml(data.scorePercentage)}%</dd>
<dt>Issued</dt><dd>${escapeHtml(data.issuedAt.toISOString())}</dd>
<dt>Expires</dt><dd>${escapeHtml(data.expiresAt?.toISOString() || 'Not set')}</dd>
<dt>Verification ID</dt><dd>${escapeHtml(data.publicId)}</dd></dl>
</main></body></html>`);
}

module.exports = {
  issueCertificate,
  listCertificates,
  getCertificate,
  certificateQr,
  certificateDocument,
  revokeCertificate,
  verifyCertificate,
  verificationPage,
};
