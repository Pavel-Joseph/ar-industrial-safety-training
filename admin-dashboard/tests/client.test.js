import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mapWorker, mapModule, mapResult, mapCertificate, mapVerification, summarize } from "../src/api/mappers.js";
import * as mockData from "../src/api/mockData.js";
import { t } from "../src/i18n/strings.js";

const API_URL = "https://ar-industrial-safety-api.onrender.com";

// Vite supplies import.meta.env in the browser. Inject it here so the actual
// client can be exercised with a fake fetch without installing a test bundler.
async function loadClient() {
  globalThis.__mockData = mockData;
  globalThis.__mappers = { mapWorker, mapModule, mapResult, mapCertificate, mapVerification, summarize };
  const path = fileURLToPath(new URL("../src/api/client.js", import.meta.url));
  const source = readFileSync(path, "utf8")
    .replace(/^import \{([^}]+)\} from "\.\/mockData\.js";/m, "const {$1} = globalThis.__mockData;")
    .replace(/^import \{([^}]+)\} from "\.\/mappers\.js";/m, "const {$1} = globalThis.__mappers;")
    .replace("import.meta.env.VITE_API_BASE_URL", JSON.stringify(API_URL));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

test("Hindi and Santali translations are active for the dashboard", () => {
  const englishOverview = t("en", "overview_title");
  const hiOverview = t("hi", "overview_title");
  const satOverview = t("sat", "overview_title");

  assert.equal(englishOverview, "Dashboard");
  assert.notEqual(hiOverview, englishOverview);
  assert.notEqual(satOverview, englishOverview);
  assert.equal(hiOverview, satOverview);
});

test("certificate mappings expose verification and QR URLs", () => {
  const certificate = mapCertificate({
    id: "cert-1",
    publicId: "public-1",
    worker: { id: "worker-0", fullName: "Worker 0" },
    module: { id: "mod_fire", name: "Fire Response" },
    status: "valid",
    issuedAt: "2026-09-18T00:00:00Z",
    verificationUrl: "https://example.test/verify/public-1"
  });

  const verification = mapVerification({
    publicId: "public-1",
    status: "valid",
    workerName: "Worker 0",
    moduleName: "Fire Response",
    issuedAt: "2026-09-18T00:00:00Z",
    verificationUrl: "https://example.test/verify/public-1",
    disclaimer: "Demo disclaimer"
  });

  assert.equal(certificate.verificationUrl, "https://example.test/verify/public-1");
  assert.match(certificate.qrCodeUrl, /qrserver/i);
  assert.equal(verification.verificationUrl, "https://example.test/verify/public-1");
  assert.match(verification.qrCodeUrl, /qrserver/i);
});

test("hosted API login, pagination, result and certificate routes", async () => {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    calls.push({ path: parsed.pathname, query: parsed.searchParams, options });
    const json = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
    if (parsed.pathname === "/api/auth/login") {
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), { email: "admin@example.com", password: "secret" });
      return json({ data: { accessToken: "test-jwt", user: { id: "admin-1", email: "admin@example.com", role: "admin" } } });
    }
    if (parsed.pathname === "/api/workers" && options.method === "POST") {
      assert.deepEqual(JSON.parse(options.body), {
        fullName: "New Worker", employeeCode: "JH-222", preferredLanguage: "sat"
      });
      return json({ data: {
        id: "worker-new", employeeCode: "JH-222", fullName: "New Worker",
        preferredLanguage: "sat", active: true, createdAt: "2026-09-18T00:00:00Z"
      } }, 201);
    }
    if (parsed.pathname === "/api/workers/worker-0") return json({ data: {
      id: "worker-0", employeeCode: "JH-0", fullName: "Worker 0",
      preferredLanguage: "hi", active: true, createdAt: "2026-09-18T00:00:00Z"
    } });
    if (parsed.pathname === "/api/workers") {
      assert.equal(options.headers.Authorization, "Bearer test-jwt");
      assert.equal(parsed.searchParams.get("limit"), "100");
      const offset = Number(parsed.searchParams.get("offset"));
      const count = offset === 0 ? 100 : 1;
      return json({
        data: Array.from({ length: count }, (_, i) => ({
          id: `worker-${offset + i}`, employeeCode: `JH-${offset + i}`, fullName: `Worker ${offset + i}`,
          preferredLanguage: "hi", active: true, createdAt: "2026-09-18T00:00:00Z"
        })),
        meta: { total: 101, limit: 100, offset }
      });
    }
    if (parsed.pathname === "/api/results") return json({ data: [{
      attemptId: "attempt-1", worker: { id: "worker-0", fullName: "Worker 0", employeeCode: "JH-0" },
      module: { id: "fire-response", name: "Fire Response", scoringVersion: "v1" },
      score: { percentage: 85, passed: true }, completedAt: "2026-09-18T00:00:00Z"
    }], meta: { total: 1, limit: 100, offset: 0 } });
    if (parsed.pathname === "/api/certificates") return json({ data: [{
      id: "cert-1", publicId: "public-1", attemptId: "attempt-1", status: "valid",
      worker: { id: "worker-0", fullName: "Worker 0" },
      module: { id: "fire-response", name: "Fire Response" }
    }], meta: { total: 1, limit: 100, offset: 0 } });
    if (parsed.pathname === "/api/verify/public-1") {
      assert.equal(options.headers.Authorization, undefined);
      return json({ data: { publicId: "public-1", status: "valid", workerName: "Worker 0", moduleName: "Fire Response" } });
    }
    if (parsed.pathname === "/api/modules") return json({ error: { message: "backend down" } }, 500);
    throw new Error(`Unexpected route: ${parsed.pathname}`);
  };

  const client = await loadClient();
  const login = await client.login("admin@example.com", "secret");
  assert.equal(login.admin.email, "admin@example.com");
  assert.equal(client.getToken(), "test-jwt");
  const workers = await client.getWorkers();
  assert.equal(workers.data.length, 101);
  assert.equal(workers.data[100].workerCode, "JH-100");
  assert.equal(calls.filter((call) => call.path === "/api/workers").length, 2);
  assert.equal((await client.getAttempts({ status: "pass" })).data[0].score, 85);
  assert.equal(calls.find((call) => call.path === "/api/results").query.get("passed"), "true");
  assert.equal((await client.getCertificates()).data[0].certificateCode, "public-1");
  assert.equal((await client.createWorker({ name: "New Worker", workerCode: "JH-222", language: "sat" })).data.workerCode, "JH-222");
  const detail = await client.getWorker("worker-0");
  assert.equal(detail.data.attempts.length, 1);
  assert.equal(detail.data.certificates.length, 1);
  assert.ok(calls.some((call) => call.path === "/api/results" && call.query.get("workerId") === "worker-0"));
  assert.equal((await client.verifyCertificate("public-1")).data.status, "valid");
  await assert.rejects(client.getModules(), /backend down/); // Never show sample data in live mode.
});
