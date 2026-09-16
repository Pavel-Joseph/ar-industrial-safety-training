import { ApiError } from './client'
import { LOCAL_ADMIN, TOKEN_KEY, USER_KEY } from '../config/env'
import { MODULE_CATALOG, MODULE_LABELS } from '../config/modules'
import { deriveWorkerProgress } from '../lib/progress'
import { newId, nextWorkerCode, store } from './localStore'

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms))

function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize
  return { data: rows.slice(start, start + pageSize), page, pageSize, total: rows.length }
}

function withProgress(worker) {
  const attempts = store.attempts().filter((a) => a.workerId === worker.id)
  const certificates = store.certificates().filter((c) => c.workerId === worker.id)
  return { ...worker, ...deriveWorkerProgress(attempts), certificatesCount: certificates.length }
}

export async function login({ email, password }) {
  await wait(420)
  if (email.trim().toLowerCase() !== LOCAL_ADMIN.email || password !== LOCAL_ADMIN.password) {
    throw new ApiError({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'Email or password is incorrect.'
    })
  }
  const user = { id: 'usr_local', name: LOCAL_ADMIN.name, email: LOCAL_ADMIN.email, role: 'admin' }
  const data = { token: 'local.session', expiresAt: new Date(Date.now() + 36e5).toISOString(), user }
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return data
}

export async function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function getModules() {
  await wait(80)
  return MODULE_CATALOG.map((m) => ({
    id: `mod_${m.code}`,
    code: m.code,
    title: { en: m.name, hi: m.name, sat: m.name },
    passPercent: 70,
    scoringVersion: '1.0.0'
  }))
}

export async function getWorkers({ query = '', page = 1, pageSize = 10 } = {}) {
  await wait()
  const q = query.trim().toLowerCase()
  let rows = store.workers().map(withProgress)
  if (q) {
    rows = rows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.workerCode.toLowerCase().includes(q) ||
        w.site.toLowerCase().includes(q)
    )
  }
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return paginate(rows, page, pageSize)
}

export async function getWorker(id) {
  await wait()
  const worker = store.workers().find((w) => w.id === id)
  if (!worker) {
    throw new ApiError({ code: 'WORKER_NOT_FOUND', status: 404, message: 'No worker with that id.' })
  }
  return {
    worker: withProgress(worker),
    attempts: store
      .attempts()
      .filter((a) => a.workerId === id)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    certificates: store.certificates().filter((c) => c.workerId === id)
  }
}

export async function createWorker(payload) {
  await wait(380)
  const workers = store.workers()

  const name = payload.name?.trim()
  if (!name) {
    throw new ApiError({ code: 'VALIDATION_FAILED', status: 422, message: 'Name is required.' })
  }
  const workerCode = payload.workerCode?.trim() || nextWorkerCode(workers)
  if (workers.some((w) => w.workerCode.toLowerCase() === workerCode.toLowerCase())) {
    throw new ApiError({
      code: 'WORKER_CODE_TAKEN',
      status: 409,
      message: `Worker code ${workerCode} is already registered.`
    })
  }

  const worker = {
    id: newId('wk'),
    workerCode,
    name,
    phone: payload.phone?.trim() ?? '',
    site: payload.site?.trim() ?? '',
    preferredLanguage: payload.preferredLanguage ?? 'hi',
    status: 'active',
    enrolledAt: new Date().toISOString()
  }
  store.setWorkers([...workers, worker])
  return withProgress(worker)
}

export async function updateWorker(id, payload) {
  await wait(220)
  const workers = store.workers()
  const index = workers.findIndex((w) => w.id === id)
  if (index === -1) {
    throw new ApiError({ code: 'WORKER_NOT_FOUND', status: 404, message: 'No worker with that id.' })
  }
  workers[index] = { ...workers[index], ...payload }
  store.setWorkers(workers)
  return withProgress(workers[index])
}

export async function getAttempts({
  workerId, moduleCode, result, from, to, page = 1, pageSize = 10
} = {}) {
  await wait()
  let rows = [...store.attempts()]
  if (workerId) rows = rows.filter((a) => a.workerId === workerId)
  if (moduleCode) rows = rows.filter((a) => a.moduleCode === moduleCode)
  if (result) rows = rows.filter((a) => a.result === result)
  if (from) rows = rows.filter((a) => a.completedAt >= from)
  if (to) rows = rows.filter((a) => a.completedAt <= `${to}T23:59:59Z`)
  rows.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
  return paginate(rows, page, pageSize)
}

export async function getCertificates({ query = '', status, page = 1, pageSize = 10 } = {}) {
  await wait()
  const q = query.trim().toLowerCase()
  let rows = [...store.certificates()]
  if (status) rows = rows.filter((c) => c.status === status)
  if (q) {
    rows = rows.filter(
      (c) => c.certificateId.toLowerCase().includes(q) || c.workerName.toLowerCase().includes(q)
    )
  }
  return paginate(rows, page, pageSize)
}

export async function verifyCertificate(certificateId) {
  await wait()
  const certificate = store
    .certificates()
    .find((c) => c.certificateId.toLowerCase() === String(certificateId).toLowerCase())
  if (!certificate) return { status: 'not_found', certificate: null }
  return { status: certificate.status, certificate }
}

export async function getOverview() {
  await wait()
  const workers = store.workers()
  const attempts = store.attempts()
  const certificates = store.certificates()

  const passed = attempts.filter((a) => a.result === 'pass').length
  const startedWorkerIds = new Set(attempts.map((a) => a.workerId))
  const certifiedWorkerIds = new Set(certificates.filter((c) => c.status === 'valid').map((c) => c.workerId))
  const today = new Date().toISOString().slice(0, 10)
  const pct = (part, whole) => (whole ? Number(((part / whole) * 100).toFixed(1)) : 0)

  return {
    workers: {
      total: workers.length,
      started: startedWorkerIds.size,
      startedPercent: pct(startedWorkerIds.size, workers.length),
      certified: certifiedWorkerIds.size,
      certifiedPercent: pct(certifiedWorkerIds.size, workers.length)
    },
    attempts: {
      total: attempts.length,
      today: attempts.filter((a) => a.completedAt.slice(0, 10) === today).length,
      offlineSynced: attempts.filter((a) => a.source === 'offline_sync').length,
      offlineSyncedPercent: pct(attempts.filter((a) => a.source === 'offline_sync').length, attempts.length)
    },
    performance: {
      passed,
      failed: attempts.length - passed,
      overallPassPercent: pct(passed, attempts.length),
      overallFailPercent: attempts.length ? Number((100 - pct(passed, attempts.length)).toFixed(1)) : 0
    },
    certificates: {
      issued: certificates.filter((c) => c.status === 'valid').length,
      revoked: certificates.filter((c) => c.status === 'revoked').length,
      issuedPerPassPercent: pct(certificates.filter((c) => c.status === 'valid').length, passed)
    }
  }
}

export async function getAttemptsByModule({ days = 7 } = {}) {
  await wait()
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const rows = store.attempts().filter((a) => a.completedAt >= since)
  return {
    days,
    modules: MODULE_CATALOG.map((m) => {
      const forModule = rows.filter((a) => a.moduleCode === m.code)
      const passed = forModule.filter((a) => a.result === 'pass').length
      return {
        moduleCode: m.code,
        label: MODULE_LABELS[m.code],
        attempts: forModule.length,
        passed,
        failed: forModule.length - passed
      }
    })
  }
}

export async function getPassRateSeries({ days = 14 } = {}) {
  await wait()
  const attempts = store.attempts()
  const points = []
  for (let d = days - 1; d >= 0; d -= 1) {
    const date = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10)
    const point = { date }
    MODULE_CATALOG.forEach((m) => {
      const sameDay = attempts.filter(
        (a) => a.moduleCode === m.code && a.completedAt.slice(0, 10) === date
      )
      if (!sameDay.length) return
      const passed = sameDay.filter((a) => a.result === 'pass').length
      point[m.code] = {
        attempts: sameDay.length,
        passed,
        passPercent: Number(((passed / sameDay.length) * 100).toFixed(1))
      }
    })
    points.push(point)
  }
  return { bucket: 'day', modules: MODULE_CATALOG.map((m) => m.code), points }
}

export async function getPassFailBreakdown() {
  await wait()
  const attempts = store.attempts()
  const modules = MODULE_CATALOG.map((m) => {
    const rows = attempts.filter((a) => a.moduleCode === m.code)
    const passed = rows.filter((a) => a.result === 'pass').length
    const passPercent = rows.length ? Number(((passed / rows.length) * 100).toFixed(1)) : 0
    return {
      moduleCode: m.code,
      label: MODULE_LABELS[m.code],
      attempts: rows.length,
      passed,
      failed: rows.length - passed,
      passPercent,
      failPercent: rows.length ? Number((100 - passPercent).toFixed(1)) : 0
    }
  })
  const passed = attempts.filter((a) => a.result === 'pass').length
  const passPercent = attempts.length ? Number(((passed / attempts.length) * 100).toFixed(1)) : 0
  return {
    modules,
    totals: {
      attempts: attempts.length,
      passed,
      failed: attempts.length - passed,
      passPercent,
      failPercent: attempts.length ? Number((100 - passPercent).toFixed(1)) : 0
    }
  }
}
