/**
 * Local mode storage.
 *
 * The dashboard ships with NO sample records. Every number on every screen
 * starts at zero and only changes because someone put data in: an administrator
 * registering a worker here, or the AR app submitting an assessment.
 *
 * In local mode those records live in the browser so the interface can be built
 * and demonstrated before the backend is reachable. In live mode the exact same
 * screens read from PostgreSQL instead, through services.live.js, and this file
 * is never loaded.
 */
const WORKERS_KEY = 'ar_admin_local_workers'
const ATTEMPTS_KEY = 'ar_admin_local_attempts'
const CERTS_KEY = 'ar_admin_local_certificates'

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows))
  return rows
}

export const store = {
  workers: () => read(WORKERS_KEY),
  attempts: () => read(ATTEMPTS_KEY),
  certificates: () => read(CERTS_KEY),
  setWorkers: (rows) => write(WORKERS_KEY, rows),
  setAttempts: (rows) => write(ATTEMPTS_KEY, rows),
  setCertificates: (rows) => write(CERTS_KEY, rows),
  clear: () => {
    ;[WORKERS_KEY, ATTEMPTS_KEY, CERTS_KEY].forEach((k) => localStorage.removeItem(k))
  }
}

export function nextWorkerCode(existing) {
  const numbers = existing
    .map((w) => Number(String(w.workerCode).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0)
  const next = numbers.length ? Math.max(...numbers) + 1 : 1001
  return `JH-${next}`
}

export function newId(prefix) {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${random}`
}
