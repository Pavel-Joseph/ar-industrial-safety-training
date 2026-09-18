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
    verificationUrl: certificate.verificationUrl
  };
}

export function mapVerification(verification) {
  return {
    certificateCode: verification.publicId,
    status: verification.status,
    workerName: verification.workerName,
    moduleName: verification.moduleName,
    issuedAt: verification.issuedAt,
    expiresAt: verification.expiresAt,
    disclaimer: verification.disclaimer
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
