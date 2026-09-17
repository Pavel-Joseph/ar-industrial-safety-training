const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function parseTimestamp(value) {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function validateIssueCertificate(body) {
  const errors = [];
  const attemptId = typeof body?.attemptId === 'string' ? body.attemptId.toLowerCase() : '';
  const expiresAt = parseTimestamp(body?.expiresAt);

  if (!UUID_PATTERN.test(attemptId)) {
    errors.push({ field: 'attemptId', message: 'A valid attempt UUID is required' });
  }
  if (
    !expiresAt ||
    expiresAt.getTime() <= Date.now()
  ) {
    errors.push({ field: 'expiresAt', message: 'A future ISO 8601 timestamp is required' });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? { attemptId, expiresAt: expiresAt.toISOString() } : undefined,
  };
}

function validateRevokeCertificate(body) {
  const errors = [];
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
  if (body?.status !== 'revoked') {
    errors.push({ field: 'status', message: 'Only revocation is supported' });
  }
  if (reason.length < 5 || reason.length > 500) {
    errors.push({ field: 'reason', message: 'A reason of 5 to 500 characters is required' });
  }
  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0 ? { status: 'revoked', reason } : undefined,
  };
}

module.exports = { validateIssueCertificate, validateRevokeCertificate };
