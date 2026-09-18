// Sample data shaped exactly like the live API contract in api/client.js.
//
// This exists so Dashboard / Workers / Results / Certificates can be built
// and demoed before Person 2's endpoints are ready. Every field here has a
// matching field in the contract doc (README -> "API contract") — when the
// live API responds, the UI does not need to change shape, only the data
// source.
//
// Kept deliberately small: 5 workers, 3 sites, 3 modules, ~10 attempts —
// enough to show every state (pass/fail, synced/pending, active/inactive,
// valid/revoked certificate) without a wall of repetitive rows.
//
// The arrays below are a genuine in-memory "session store" (not re-cloned
// fresh on every read) so that creating a worker through the dashboard's
// "Add Worker" form actually shows up in the list for the rest of the
// session, the way it would against a real backend. It resets on page
// reload — there's no real persistence until VITE_API_BASE_URL points at
// Person 2's database.

export const MODULES = [
  { id: "mod_fire", name: "Fire and Explosion Response", code: "FIRE" },
  { id: "mod_gas", name: "Gas Leak and Confined Space Protocol", code: "GAS" },
  { id: "mod_bonus", name: "Jharkhand Mine-Worker Module", code: "BONUS" }
];

let workers = [
  { id: "wkr_1001", name: "Ramesh Soren", workerCode: "JH-1001", site: "Jharia Mine Site", language: "hi", status: "active", registeredAt: "2026-09-02T05:12:00Z" },
  { id: "wkr_1002", name: "Birsa Murmu", workerCode: "JH-1002", site: "Jharia Mine Site", language: "sat", status: "active", registeredAt: "2026-09-02T05:20:00Z" },
  { id: "wkr_1003", name: "Sunita Kumari", workerCode: "JH-1014", site: "Bokaro Mine Site", language: "hi", status: "active", registeredAt: "2026-09-03T06:40:00Z" },
  { id: "wkr_1004", name: "Anil Hansda", workerCode: "JH-1022", site: "Bokaro Mine Site", language: "sat", status: "active", registeredAt: "2026-09-04T04:55:00Z" },
  { id: "wkr_1005", name: "Priya Mahato", workerCode: "JH-1031", site: "Dhanbad Mine Site", language: "hi", status: "inactive", registeredAt: "2026-09-05T09:10:00Z" }
];

let attempts = [
  // Spread across 2026-09-06 -> 09-14 and all three modules, so the
  // dashboard's charts have enough points to actually plot: every module
  // needs at least two attempts on different days for its area line to be
  // visible, and a realistic mix of pass/fail so the radar isn't a flat
  // 100% shape. These are the numbers the Dashboard figures are derived
  // from — change them here and every chart/KPI updates accordingly.

  // --- Fire and Explosion Response ---
  { id: "att_9001", workerId: "wkr_1005", moduleId: "mod_fire", score: 95, status: "pass", durationSeconds: 233, syncState: "synced", completedAt: "2026-09-06T06:20:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9002", workerId: "wkr_1001", moduleId: "mod_fire", score: 92, status: "pass", durationSeconds: 244, syncState: "synced", completedAt: "2026-09-08T07:12:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9003", workerId: "wkr_1002", moduleId: "mod_fire", score: 54, status: "fail", durationSeconds: 198, syncState: "synced", completedAt: "2026-09-08T08:02:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9004", workerId: "wkr_1004", moduleId: "mod_fire", score: 65, status: "fail", durationSeconds: 205, syncState: "synced", completedAt: "2026-09-09T11:15:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9005", workerId: "wkr_1002", moduleId: "mod_fire", score: 81, status: "pass", durationSeconds: 221, syncState: "pending", completedAt: "2026-09-11T08:20:00Z", attemptNumber: 2, scoringVersion: "v1" },
  { id: "att_9006", workerId: "wkr_1003", moduleId: "mod_fire", score: 90, status: "pass", durationSeconds: 251, syncState: "synced", completedAt: "2026-09-12T09:15:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9007", workerId: "wkr_1004", moduleId: "mod_fire", score: 84, status: "pass", durationSeconds: 219, syncState: "synced", completedAt: "2026-09-14T07:05:00Z", attemptNumber: 2, scoringVersion: "v1" },

  // --- Gas Leak and Confined Space Protocol ---
  { id: "att_9008", workerId: "wkr_1001", moduleId: "mod_gas", score: 78, status: "pass", durationSeconds: 310, syncState: "synced", completedAt: "2026-09-09T07:40:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9009", workerId: "wkr_1003", moduleId: "mod_gas", score: 88, status: "pass", durationSeconds: 267, syncState: "synced", completedAt: "2026-09-10T10:05:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9010", workerId: "wkr_1002", moduleId: "mod_gas", score: 58, status: "fail", durationSeconds: 201, syncState: "synced", completedAt: "2026-09-11T12:30:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9011", workerId: "wkr_1004", moduleId: "mod_gas", score: 90, status: "pass", durationSeconds: 288, syncState: "pending", completedAt: "2026-09-12T11:40:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9012", workerId: "wkr_1002", moduleId: "mod_gas", score: 83, status: "pass", durationSeconds: 279, syncState: "synced", completedAt: "2026-09-14T09:50:00Z", attemptNumber: 2, scoringVersion: "v1" },

  // --- Jharkhand Mine-Worker Module (optional bonus) ---
  { id: "att_9013", workerId: "wkr_1003", moduleId: "mod_bonus", score: 75, status: "pass", durationSeconds: 298, syncState: "synced", completedAt: "2026-09-10T09:30:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9014", workerId: "wkr_1001", moduleId: "mod_bonus", score: 61, status: "fail", durationSeconds: 264, syncState: "synced", completedAt: "2026-09-12T13:10:00Z", attemptNumber: 1, scoringVersion: "v1" },
  { id: "att_9015", workerId: "wkr_1001", moduleId: "mod_bonus", score: 79, status: "pass", durationSeconds: 291, syncState: "pending", completedAt: "2026-09-14T13:25:00Z", attemptNumber: 2, scoringVersion: "v1" }
];

let certificates = [
  // One certificate per validated PASSING attempt only — the same rule the
  // backend enforces. attemptId must point at a real passing attempt above.
  { id: "cert_5001", certificateCode: "AR-CERT-5001", workerId: "wkr_1005", moduleId: "mod_fire", attemptId: "att_9001", status: "revoked", issuedAt: "2026-09-06T06:22:00Z" },
  { id: "cert_5002", certificateCode: "AR-CERT-5002", workerId: "wkr_1001", moduleId: "mod_fire", attemptId: "att_9002", status: "valid", issuedAt: "2026-09-08T07:15:00Z" },
  { id: "cert_5003", certificateCode: "AR-CERT-5003", workerId: "wkr_1001", moduleId: "mod_gas", attemptId: "att_9008", status: "valid", issuedAt: "2026-09-09T07:42:00Z" },
  { id: "cert_5004", certificateCode: "AR-CERT-5004", workerId: "wkr_1003", moduleId: "mod_gas", attemptId: "att_9009", status: "valid", issuedAt: "2026-09-10T10:08:00Z" },
  { id: "cert_5005", certificateCode: "AR-CERT-5005", workerId: "wkr_1003", moduleId: "mod_bonus", attemptId: "att_9013", status: "valid", issuedAt: "2026-09-10T09:33:00Z" },
  { id: "cert_5006", certificateCode: "AR-CERT-5006", workerId: "wkr_1003", moduleId: "mod_fire", attemptId: "att_9006", status: "valid", issuedAt: "2026-09-12T09:18:00Z" },
  { id: "cert_5007", certificateCode: "AR-CERT-5007", workerId: "wkr_1004", moduleId: "mod_gas", attemptId: "att_9011", status: "valid", issuedAt: "2026-09-12T11:43:00Z" }
];

export function getMockModules() {
  return MODULES.map((m) => ({ ...m }));
}

export function getMockWorkers() {
  return workers.map((w) => ({ ...w }));
}

export function addMockWorker(worker) {
  workers = [worker, ...workers];
  return { ...worker };
}

export function getMockAttempts() {
  return attempts.map((a) => ({ ...a }));
}

export function getMockCertificates() {
  return certificates.map((c) => ({ ...c }));
}
