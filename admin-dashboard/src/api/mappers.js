const QR_SERVER_BASE = "https://api.qrserver.com/v1/create-qr-code/";
const PUBLIC_VERIFICATION_BASE = "https://ar-industrial-safety-api.onrender.com";

function buildQrCodeUrl(verificationUrl) {
  const url = verificationUrl || "https://example.test/verify/placeholder";
  const encoded = encodeURIComponent(url);
  return `${QR_SERVER_BASE}?data=${encoded}&size=220x220&charset-source=UTF-8&charset-target=UTF-8&ecc=L&color=0-0-0&bgcolor=255-255-255`;
}

// Translate the backend's nested response into the dashboard view model.
export function mapWorker(worker) {
  return {
    id: worker.id,
    name: worker.fullName,
    workerCode: worker.employeeCode,
    site: null, // The backend does not currently store a site.
    language: worker.preferredLanguage,
    status: worker.active ? "active" : "inactive",
    registeredAt: worker.createdAt
  };
}

export function mapModule(module) {
  const code = module.id === "fire-response" ? "FIRE"
    : module.id === "gas-confined-space" ? "GAS"
    : module.id === "jharkhand-mine-safety" ? "BONUS"
    : module.id.toUpperCase();
  return { ...module, code };
}

export function mapResult(result) {
  return {
    id: result.attemptId,
    workerId: result.worker.id,
    workerName: result.worker.fullName,
    workerCode: result.worker.employeeCode,
    moduleId: result.module.id,
    moduleName: result.module.name,
    score: result.score.percentage,
    status: result.score.passed ? "pass" : "fail",
    syncState: "synced", // Only validated, server-side results appear here.
    completedAt: result.completedAt,
    scoringVersion: result.module.scoringVersion,
    durationSeconds: result.startedAt && result.completedAt
      ? Math.max(0, Math.round((new Date(result.completedAt) - new Date(result.startedAt)) / 1000))
      : null
  };
}

export function mapCertificate(certificate) {
  const verificationUrl = certificate.verificationUrl || `${PUBLIC_VERIFICATION_BASE}/verify/${certificate.publicId}`;
  return {
    id: certificate.id,
    certificateCode: certificate.publicId,
    workerId: certificate.worker.id,
    workerName: certificate.worker.fullName,
    moduleId: certificate.module.id,
    moduleName: certificate.module.name,
    attemptId: certificate.attemptId,
    status: certificate.status,
    issuedAt: certificate.issuedAt,
    expiresAt: certificate.expiresAt,
    verificationUrl,
    qrCodeUrl: buildQrCodeUrl(verificationUrl)
  };
}

export function mapVerification(verification) {
  const verificationUrl = verification.verificationUrl || `${PUBLIC_VERIFICATION_BASE}/verify/${verification.publicId}`;
  return {
    certificateCode: verification.publicId,
    status: verification.status,
    workerName: verification.workerName,
    moduleName: verification.moduleName,
    issuedAt: verification.issuedAt,
    expiresAt: verification.expiresAt,
    disclaimer: verification.disclaimer,
    verificationUrl,
    qrCodeUrl: buildQrCodeUrl(verificationUrl)
  };
}

export function summarize(workers, attempts, certificates) {
  const passed = attempts.filter((attempt) => attempt.status === "pass").length;
  return {
    workerCount: workers.length,
    attemptCount: attempts.length,
    passRate: attempts.length ? Math.round((passed / attempts.length) * 100) : 0,
    certificateCount: certificates.filter((certificate) => certificate.status === "valid").length,
    pendingSyncCount: attempts.filter((attempt) => attempt.syncState === "pending").length
  };
}
