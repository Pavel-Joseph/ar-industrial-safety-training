import { ApiError } from './client'
import { TOKEN_KEY, USER_KEY } from '../config/env'
import {
  ADMIN_USER, ATTEMPTS, CERTIFICATES, MODULES, WORKERS,
  buildPassFailBreakdown, buildPassRateSeries
} from './mockData'

const wait = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms))

function paginate(rows, page, pageSize) {
  const start = (page - 1) * pageSize
  return { data: rows.slice(start, start + pageSize), page, pageSize, total: rows.length }
}

export async function login({ email, password }) {
  await wait(500)
  if (email.trim().toLowerCase() !== ADMIN_USER.email || password !== 'admin123') {
    throw new ApiError({
      code: 'INVALID_CREDENTIALS',
      status: 401,
      message: 'Email or password is incorrect.'
    })
  }
  const data = { token: 'mock.jwt.token', expiresAt: new Date(Date.now() + 36e5).toISOString(), user: ADMIN_USER }
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export async function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function getModules() {
  await wait(120)
  return MODULES
}

export async function getWorkers({ query = '', page = 1, pageSize = 10 } = {}) {
  await wait()
  const q = query.trim().toLowerCase()
  const rows = q
    ? WORKERS.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.workerCode.toLowerCase().includes(q) ||
          w.site.toLowerCase().includes(q)
      )
    : WORKERS
  return paginate(rows, page, pageSize)
}

export async function getWorker(id) {
  await wait()
  const worker = WORKERS.find((w) => w.id === id)
  if (!worker) {
    throw new ApiError({ code: 'WORKER_NOT_FOUND', status: 404, message: 'No worker with that id.' })
  }
  return {
    worker,
    attempts: ATTEMPTS.filter((a) => a.workerId === id),
    certificates: CERTIFICATES.filter((c) => c.workerId === id)
  }
}

export async function getAttempts({
  workerId, moduleCode, result, from, to, page = 1, pageSize = 10
} = {}) {
  await wait()
  let rows = [...ATTEMPTS]
  if (workerId) rows = rows.filter((a) => a.workerId === workerId)
  if (moduleCode) rows = rows.filter((a) => a.moduleCode === moduleCode)
  if (result) rows = rows.filter((a) => a.result === result)
  if (from) rows = rows.filter((a) => a.completedAt >= from)
  if (to) rows = rows.filter((a) => a.completedAt <= `${to}T23:59:59Z`)
  return paginate(rows, page, pageSize)
}

export async function getCertificates({ query = '', status, page = 1, pageSize = 10 } = {}) {
  await wait()
  const q = query.trim().toLowerCase()
  let rows = [...CERTIFICATES]
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
  const certificate = CERTIFICATES.find(
    (c) => c.certificateId.toLowerCase() === String(certificateId).toLowerCase()
  )
  if (!certificate) return { status: 'not_found', certificate: null }
  return { status: certificate.status, certificate }
}

export async function getOverview() {
  await wait()
  const passed = ATTEMPTS.filter((a) => a.result === 'pass').length
  const today = new Date().toISOString().slice(0, 10)
  return {
    workers: {
      total: WORKERS.length,
      activeLast7Days: new Set(
        ATTEMPTS.filter(
          (a) => new Date(a.completedAt) > new Date(Date.now() - 7 * 864e5)
        ).map((a) => a.workerId)
      ).size
    },
    attempts: {
      total: ATTEMPTS.length,
      today: ATTEMPTS.filter((a) => a.completedAt.slice(0, 10) === today).length,
      offlineSynced: ATTEMPTS.filter((a) => a.source === 'offline_sync').length
    },
    performance: {
      overallPassPercent: Number(((passed / ATTEMPTS.length) * 100).toFixed(1))
    },
    certificates: {
      issued: CERTIFICATES.filter((c) => c.status === 'valid').length,
      revoked: CERTIFICATES.filter((c) => c.status === 'revoked').length
    }
  }
}

export async function getPassRateSeries({ days = 14 } = {}) {
  await wait()
  return buildPassRateSeries(days)
}

export async function getPassFailBreakdown() {
  await wait()
  return buildPassFailBreakdown()
}
