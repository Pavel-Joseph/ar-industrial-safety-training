// ---------------------------------------------------------------------------
// API CLIENT — the single place this dashboard talks to Person 2's backend.
//
// This file is deliberately the only file that knows about HTTP, endpoint
// paths and response shapes. Every page imports functions from here instead
// of calling fetch() directly, so when the real backend URL/paths differ
// from the draft contract below, only this file needs to change.
//
// FALLBACK BEHAVIOUR
// If VITE_API_BASE_URL is not set, or a GET request fails (backend not up
// yet, CORS not configured, endpoint not built yet), every read function
// below falls back to the contract-shaped sample data in mockData.js and
// resolves normally with source: "mock" instead of throwing. Pages use that
// flag to show the "sample data" banner via <DataState>. This means the
// whole dashboard is demoable from Day 1 and swaps to live data the moment
// the backend answers requests — no code changes required on this side.
// Writes (login, createWorker) do NOT silently fall back to mock on a live
// failure — a failed write should surface as an error, not pretend to
// succeed against sample data.
//
// DRAFT CONTRACT (confirm with Person 2 on Day 1, update paths here only)
//   POST   /api/auth/login              { email, password } -> { token, admin }
//   GET    /api/summary                                     -> dashboard totals
//   GET    /api/workers                 ?search=             -> Worker[]
//   POST   /api/workers                 { name, workerCode, site, language } -> Worker
//   GET    /api/workers/:id                                  -> Worker
//   GET    /api/modules                                      -> Module[]
//   GET    /api/attempts       ?workerId=&moduleId=&status=  -> Attempt[]
//   GET    /api/certificates   ?status=                      -> Certificate[]
//   GET    /api/certificates/verify/:certificateCode  (public, no auth)
//                                                             -> Certificate | 404
//
// SHARED IDENTIFIERS (must match Person 2's schema and Person 1's event
// payloads exactly, since attempt/worker/certificate IDs flow app -> API ->
// dashboard unchanged):
//   Worker      { id, name, workerCode, site, language, status, registeredAt }
//                 status: "active" | "inactive"   <- new field, see README §4
//   Module      { id, name, code }        code: "FIRE" | "GAS" | "BONUS"
//                 Three modules now: the two required ones plus the
//                 optional Jharkhand mine-worker bonus module from the
//                 workflow plan. GET /api/modules should return all three
//                 it has content for — the dashboard renders whatever list
//                 comes back, so adding/removing a module needs no
//                 dashboard changes.
//   Attempt     { id, workerId, moduleId, score, status, durationSeconds,
//                 syncState, completedAt, attemptNumber, scoringVersion }
//                 status: "pass" | "fail"    syncState: "synced" | "pending"
//   Certificate { id, certificateCode, workerId, moduleId, attemptId,
//                 status, issuedAt }
//                 status: "valid" | "revoked"
//
// If Person 2's backend doesn't return `status` on Worker yet, the UI
// defaults missing values to "active" (see getWorkers/getWorker below) so
// nothing breaks or shows "undefined" before that field ships.
// ---------------------------------------------------------------------------

import { getMockModules, getMockWorkers, addMockWorker, getMockAttempts, getMockCertificates } from "./mockData.js";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const TOKEN_KEY = "dashboard_admin_token";
const MOCK_DELAY_MS = 260;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withDefaultStatus(worker) {
  return worker ? { status: "active", ...worker } : worker;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function isLiveModeConfigured() {
  return Boolean(BASE_URL);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// A tiny in-memory mock "session" so login works believably in sample mode.
const DEMO_ADMIN = {
  email: "admin@site.local",
  password: "admin123",
  admin: { id: "adm_1", name: "Site Administrator", email: "admin@site.local", role: "admin" }
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email, password) {
  if (isLiveModeConfigured()) {
    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false
      });
      setToken(data.token);
      return { admin: data.admin, source: "live" };
    } catch (e) {
      throw new Error("Sign-in failed. Check credentials or backend availability.");
    }
  }

  await delay(MOCK_DELAY_MS);
  if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
    throw new Error("Invalid credentials");
  }
  setToken("mock-session-token");
  return { admin: DEMO_ADMIN.admin, source: "mock" };
}

export function logout() {
  clearToken();
}

// ---------------------------------------------------------------------------
// Fetchers — each tries live API first, falls back to sample data.
// Every resolved value has shape: { data, source: "live" | "mock" }
// ---------------------------------------------------------------------------

export async function getSummary() {
  if (isLiveModeConfigured()) {
    try {
      const data = await request("/api/summary");
      return { data, source: "live" };
    } catch (e) {
      /* fall through to mock */
    }
  }
  await delay(MOCK_DELAY_MS);
  const workers = getMockWorkers();
  const attempts = getMockAttempts();
  const certificates = getMockCertificates();
  const passCount = attempts.filter((a) => a.status === "pass").length;
  return {
    data: {
      workerCount: workers.length,
      attemptCount: attempts.length,
      passRate: attempts.length ? Math.round((passCount / attempts.length) * 100) : 0,
      certificateCount: certificates.filter((c) => c.status === "valid").length,
      pendingSyncCount: attempts.filter((a) => a.syncState === "pending").length
    },
    source: "mock"
  };
}

export async function getWorkers(search = "") {
  if (isLiveModeConfigured()) {
    try {
      const data = await request(`/api/workers?search=${encodeURIComponent(search)}`);
      return { data: data.map(withDefaultStatus), source: "live" };
    } catch (e) {
      /* fall through */
    }
  }
  await delay(MOCK_DELAY_MS);
  const q = search.trim().toLowerCase();
  const all = getMockWorkers();
  const workers = q
    ? all.filter((w) => w.name.toLowerCase().includes(q) || w.workerCode.toLowerCase().includes(q))
    : all;
  return { data: workers, source: "mock" };
}

// Used by the "+ Add Worker" form on the Workers page. In live mode this is
// a real write and failures are surfaced to the caller (no silent mock
// fallback for a create — pretending it succeeded would be misleading).
export async function createWorker({ name, workerCode, site, language }) {
  if (isLiveModeConfigured()) {
    const data = await request("/api/workers", {
      method: "POST",
      body: { name, workerCode, site, language }
    });
    return { data: withDefaultStatus(data), source: "live" };
  }

  await delay(MOCK_DELAY_MS);
  const worker = {
    id: `wkr_${Date.now()}`,
    name,
    workerCode,
    site,
    language,
    status: "active",
    registeredAt: new Date().toISOString()
  };
  return { data: addMockWorker(worker), source: "mock" };
}

export async function getWorker(workerId) {
  if (isLiveModeConfigured()) {
    try {
      const data = await request(`/api/workers/${workerId}`);
      return { data: withDefaultStatus(data), source: "live" };
    } catch (e) {
      /* fall through */
    }
  }
  await delay(MOCK_DELAY_MS);
  const worker = getMockWorkers().find((w) => w.id === workerId) || null;
  const attempts = getMockAttempts().filter((a) => a.workerId === workerId);
  const certificates = getMockCertificates().filter((c) => c.workerId === workerId);
  return { data: worker ? { ...worker, attempts, certificates } : null, source: "mock" };
}

export async function getModules() {
  if (isLiveModeConfigured()) {
    try {
      const data = await request("/api/modules");
      return { data, source: "live" };
    } catch (e) {
      /* fall through */
    }
  }
  await delay(MOCK_DELAY_MS);
  return { data: getMockModules(), source: "mock" };
}

export async function getAttempts({ workerId, moduleId, status } = {}) {
  if (isLiveModeConfigured()) {
    try {
      const params = new URLSearchParams();
      if (workerId) params.set("workerId", workerId);
      if (moduleId) params.set("moduleId", moduleId);
      if (status) params.set("status", status);
      const data = await request(`/api/attempts?${params.toString()}`);
      return { data, source: "live" };
    } catch (e) {
      /* fall through */
    }
  }
  await delay(MOCK_DELAY_MS);
  let attempts = getMockAttempts();
  if (workerId) attempts = attempts.filter((a) => a.workerId === workerId);
  if (moduleId) attempts = attempts.filter((a) => a.moduleId === moduleId);
  if (status) attempts = attempts.filter((a) => a.status === status);

  const workersById = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modulesById = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  const enriched = attempts
    .map((a) => ({
      ...a,
      workerName: workersById[a.workerId]?.name ?? "Unknown",
      workerCode: workersById[a.workerId]?.workerCode ?? "—",
      moduleName: modulesById[a.moduleId]?.name ?? "Unknown module"
    }))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return { data: enriched, source: "mock" };
}

export async function getCertificates({ status } = {}) {
  if (isLiveModeConfigured()) {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const data = await request(`/api/certificates?${params.toString()}`);
      return { data, source: "live" };
    } catch (e) {
      /* fall through */
    }
  }
  await delay(MOCK_DELAY_MS);
  const all = getMockCertificates();
  let certs = status ? all.filter((c) => c.status === status) : all;
  const workersById = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modulesById = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  const enriched = certs.map((c) => ({
    ...c,
    workerName: workersById[c.workerId]?.name ?? "Unknown",
    moduleName: modulesById[c.moduleId]?.name ?? "Unknown module"
  }));
  return { data: enriched, source: "mock" };
}

// Public — deliberately unauthenticated. Opened directly from a QR code by
// anyone, including someone with no admin session, so it must never require
// a token and must never return more than these fields.
export async function verifyCertificate(certificateCode) {
  if (isLiveModeConfigured()) {
    try {
      const data = await request(
        `/api/certificates/verify/${encodeURIComponent(certificateCode)}`,
        { auth: false }
      );
      return { data, source: "live" };
    } catch (e) {
      if (e.status === 404) return { data: null, source: "live" };
      /* fall through to mock on network/other errors */
    }
  }
  await delay(MOCK_DELAY_MS);
  const cert = getMockCertificates().find((c) => c.certificateCode === certificateCode) || null;
  if (!cert) return { data: null, source: "mock" };
  const workersById = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modulesById = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  return {
    data: {
      certificateCode: cert.certificateCode,
      status: cert.status,
      issuedAt: cert.issuedAt,
      workerName: workersById[cert.workerId]?.name ?? "Unknown",
      moduleName: modulesById[cert.moduleId]?.name ?? "Unknown module"
    },
    source: "mock"
  };
}

export function isLiveMode() {
  return isLiveModeConfigured();
}
