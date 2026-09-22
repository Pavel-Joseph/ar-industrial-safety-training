// The dashboard's sole HTTP boundary. A configured API never falls back to
// sample records on failure, so live errors cannot masquerade as real data.
import {
  getMockModules, getMockWorkers, addMockWorker, getMockAttempts, getMockCertificates,
  issueMockCertificate, revokeMockCertificate
} from "./mockData.js";
import { mapWorker, mapModule, mapResult, mapCertificate, mapVerification, summarize } from "./mappers.js";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "dashboard_admin_token";
const ADMIN_KEY = "dashboard_admin_user";
const PAGE_SIZE = 100;
const delay = () => new Promise((resolve) => setTimeout(resolve, 260));
const live = () => Boolean(BASE_URL);

export function isLiveMode() { return live(); }
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (live() && token === "mock-session-token") {
    clearToken();
    return null;
  }
  if (live() && token?.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp && payload.exp * 1000 <= Date.now()) {
        clearToken();
        return null;
      }
    } catch { /* The backend will reject an invalid token. */ }
  }
  return token;
}
export function getStoredAdmin() {
  try {
    const value = JSON.parse(localStorage.getItem(ADMIN_KEY) || "null");
    return value?.email ? value : null;
  } catch { return null; }
}
function storeSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

// Backend list endpoints cap a page at 100. Fetch every page for accurate
// totals, charts and worker histories.
async function fetchAll(path, filters = {}) {
  const all = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({ ...filters, limit: String(PAGE_SIZE), offset: String(offset) });
    const page = await request(`${path}?${params}`);
    if (!Array.isArray(page.data)) throw new Error(`Unexpected response from ${path}`);
    all.push(...page.data);
    if (page.data.length < PAGE_SIZE || all.length >= page.meta?.total) return all;
  }
}

const DEMO_ADMIN = {
  email: "admin@site.local", password: "admin123",
  admin: { id: "adm_1", name: "Site Administrator", email: "admin@site.local", role: "admin" }
};

export async function login(email, password) {
  if (live()) {
    const response = await request("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
    if (!response.data?.accessToken || !response.data?.user) throw new Error("Unexpected login response from backend");
    const admin = { ...response.data.user, name: "Site Administrator" };
    storeSession(response.data.accessToken, admin);
    return { admin, source: "live" };
  }
  await delay();
  if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) {
    throw new Error("Invalid credentials");
  }
  storeSession("mock-session-token", DEMO_ADMIN.admin);
  return { admin: DEMO_ADMIN.admin, source: "mock" };
}
export function logout() { clearToken(); }

export async function getSummary() {
  if (live()) {
    const [workers, attempts, certificates] = await Promise.all([getWorkers(), getAttempts(), getCertificates()]);
    return { data: summarize(workers.data, attempts.data, certificates.data), source: "live" };
  }
  await delay();
  return { data: summarize(getMockWorkers(), getMockAttempts(), getMockCertificates()), source: "mock" };
}

export async function getWorkers(search = "") {
  if (live()) {
    const rows = await fetchAll("/api/workers", search ? { search } : {});
    return { data: rows.map(mapWorker), source: "live" };
  }
  await delay();
  const q = search.trim().toLowerCase();
  return {
    data: getMockWorkers().filter((w) => !q || w.name.toLowerCase().includes(q) || w.workerCode.toLowerCase().includes(q)),
    source: "mock"
  };
}

export async function createWorker({ name, workerCode, site, language, pin }) {
  if (live()) {
    const response = await request("/api/workers", {
      method: "POST", body: { fullName: name, employeeCode: workerCode, preferredLanguage: language, pin }
    });
    return { data: mapWorker(response.data), source: "live" };
  }
  await delay();
  const worker = { id: `wkr_${Date.now()}`, name, workerCode, site, language, status: "active", registeredAt: new Date().toISOString() };
  return { data: addMockWorker(worker), source: "mock" };
}

export async function getWorker(workerId) {
  if (live()) {
    const response = await request(`/api/workers/${encodeURIComponent(workerId)}`);
    const [attempts, certificates] = await Promise.all([getAttempts({ workerId }), getCertificates({ workerId })]);
    return { data: { ...mapWorker(response.data), attempts: attempts.data, certificates: certificates.data }, source: "live" };
  }
  await delay();
  const worker = getMockWorkers().find((w) => w.id === workerId) || null;
  return {
    data: worker ? {
      ...worker,
      attempts: getMockAttempts().filter((a) => a.workerId === workerId),
      certificates: getMockCertificates().filter((c) => c.workerId === workerId)
    } : null,
    source: "mock"
  };
}

export async function setWorkerPin(workerId, pin) {
  if (!live()) return { data: { workerId, pinConfigured: true }, source: "mock" };
  const response = await request(`/api/workers/${encodeURIComponent(workerId)}/pin`, {
    method: "PATCH", body: { pin }
  });
  return { data: response.data, source: "live" };
}

export async function getModules() {
  if (live()) {
    const response = await request("/api/modules");
    return { data: response.data.map(mapModule), source: "live" };
  }
  await delay();
  return { data: getMockModules(), source: "mock" };
}

export async function getAttempts({ workerId, moduleId, status } = {}) {
  if (live()) {
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (moduleId) filters.moduleId = moduleId;
    if (status === "pass" || status === "fail") filters.passed = String(status === "pass");
    return { data: (await fetchAll("/api/results", filters)).map(mapResult), source: "live" };
  }
  await delay();
  let attempts = getMockAttempts();
  if (workerId) attempts = attempts.filter((a) => a.workerId === workerId);
  if (moduleId) attempts = attempts.filter((a) => a.moduleId === moduleId);
  if (status) attempts = attempts.filter((a) => a.status === status);
  const workers = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modules = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  return {
    data: attempts.map((a) => ({ ...a,
      workerName: workers[a.workerId]?.name ?? "Unknown",
      workerCode: workers[a.workerId]?.workerCode ?? "—",
      moduleName: modules[a.moduleId]?.name ?? "Unknown module"
    })).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    source: "mock"
  };
}

export async function getCertificates({ workerId, moduleId, status } = {}) {
  if (live()) {
    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (moduleId) filters.moduleId = moduleId;
    if (status) filters.status = status;
    return { data: (await fetchAll("/api/certificates", filters)).map(mapCertificate), source: "live" };
  }
  await delay();
  let certificates = getMockCertificates();
  if (workerId) certificates = certificates.filter((c) => c.workerId === workerId);
  if (moduleId) certificates = certificates.filter((c) => c.moduleId === moduleId);
  if (status) certificates = certificates.filter((c) => c.status === status);
  const workers = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modules = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  return { data: certificates.map((c) => ({ ...c,
    workerName: workers[c.workerId]?.name ?? "Unknown",
    moduleName: modules[c.moduleId]?.name ?? "Unknown module"
  })), source: "mock" };
}

export async function issueCertificate(attemptId, expiresAt) {
  if (live()) {
    const response = await request("/api/certificates", {
      method: "POST",
      body: { attemptId, expiresAt }
    });
    return { data: mapCertificate(response.data), source: "live" };
  }
  await delay();
  return { data: issueMockCertificate(attemptId, expiresAt), source: "mock" };
}

export async function revokeCertificate(certificateId, reason) {
  if (live()) {
    const response = await request(`/api/certificates/${encodeURIComponent(certificateId)}/status`, {
      method: "PATCH",
      body: { status: "revoked", reason }
    });
    return { data: mapCertificate(response.data), source: "live" };
  }
  await delay();
  return { data: revokeMockCertificate(certificateId, reason), source: "mock" };
}

// Public verification does not require an admin session.
export async function verifyCertificate(certificateCode) {
  if (live()) {
    try {
      const response = await request(`/api/verify/${encodeURIComponent(certificateCode)}`, { auth: false });
      return { data: mapVerification(response.data), source: "live" };
    } catch (error) {
      if (error.status === 400 || error.status === 404) return { data: null, source: "live" };
      throw error;
    }
  }
  await delay();
  const cert = getMockCertificates().find((c) => c.certificateCode === certificateCode) || null;
  if (!cert) return { data: null, source: "mock" };
  const workers = Object.fromEntries(getMockWorkers().map((w) => [w.id, w]));
  const modules = Object.fromEntries(getMockModules().map((m) => [m.id, m]));
  return { data: {
    certificateCode: cert.certificateCode, status: cert.status, issuedAt: cert.issuedAt,
    workerName: workers[cert.workerId]?.name ?? "Unknown",
    moduleName: modules[cert.moduleId]?.name ?? "Unknown module"
  }, source: "mock" };
}
