import test from "node:test";
import assert from "node:assert/strict";
import {
  mapWorker, mapModule, mapResult, mapCertificate, mapVerification, summarize
} from "../src/api/mappers.js";

test("backend records are mapped to the dashboard without inventing site or pending sync", () => {
  const worker = mapWorker({
    id: "worker-1", employeeCode: "JH-1001", fullName: "Ramesh Soren",
    preferredLanguage: "hi", active: true, createdAt: "2026-09-18T00:00:00Z"
  });
  assert.equal(worker.workerCode, "JH-1001");
  assert.equal(worker.site, null);
  assert.equal(worker.status, "active");

  const module = mapModule({ id: "jharkhand-mine-safety", name: "Mine Safety" });
  assert.equal(module.code, "BONUS");

  const attempt = mapResult({
    attemptId: "attempt-1",
    worker: { id: "worker-1", employeeCode: "JH-1001", fullName: "Ramesh Soren" },
    module: { id: "fire-response", name: "Fire Response", scoringVersion: "v1" },
    score: { percentage: 86, passed: true },
    startedAt: "2026-09-18T00:00:00Z", completedAt: "2026-09-18T00:02:00Z"
  });
  assert.equal(attempt.status, "pass");
  assert.equal(attempt.syncState, "synced");
  assert.equal(attempt.durationSeconds, 120);
  assert.equal(attempt.workerId, worker.id);
  assert.equal(attempt.moduleId, "fire-response");

  const cert = mapCertificate({
    id: "certificate-1", publicId: "public-uuid", attemptId: "attempt-1", status: "expired",
    issuedAt: "2026-09-18T00:03:00Z", expiresAt: "2027-09-18T00:00:00Z",
    worker: { id: "worker-1", fullName: "Ramesh Soren" },
    module: { id: "fire-response", name: "Fire Response" }
  });
  assert.equal(cert.certificateCode, "public-uuid");
  assert.equal(cert.status, "expired");
  assert.equal(summarize([worker], [attempt], [cert]).certificateCount, 0);
  assert.equal(summarize([worker], [attempt], [cert]).pendingSyncCount, 0);
});

test("public verification maps the public ID and status", () => {
  const record = mapVerification({
    publicId: "public-uuid", status: "revoked", workerName: "Ramesh Soren",
    moduleName: "Fire Response", issuedAt: "2026-09-18T00:03:00Z"
  });
  assert.equal(record.certificateCode, "public-uuid");
  assert.equal(record.status, "revoked");
});
