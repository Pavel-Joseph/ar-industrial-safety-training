import { get, patch, post } from './client'
import { ENDPOINTS } from './contract'
import { TOKEN_KEY, USER_KEY } from '../config/env'

export async function login({ email, password }) {
  const data = await post(ENDPOINTS.login, { email, password })
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data
}

export async function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getModules = () => get(ENDPOINTS.modules)

export const getWorkers = ({ query = '', page = 1, pageSize = 10 } = {}) =>
  get(ENDPOINTS.workers, { query, page, pageSize })

export const getWorker = (id) => get(ENDPOINTS.worker(id))

/** Registering a worker is the one write the dashboard performs. */
export const createWorker = (payload) => post(ENDPOINTS.workers, payload)

export const updateWorker = (id, payload) => patch(ENDPOINTS.worker(id), payload)

export const getAttempts = ({
  workerId, moduleCode, result, from, to, page = 1, pageSize = 10
} = {}) =>
  get(ENDPOINTS.attempts, { workerId, moduleCode, result, from, to, page, pageSize })

export const getCertificates = ({ query = '', status, page = 1, pageSize = 10 } = {}) =>
  get(ENDPOINTS.certificates, { query, status, page, pageSize })

export const verifyCertificate = (certificateId) => get(ENDPOINTS.verify(certificateId))

export const getOverview = () => get(ENDPOINTS.overview)

export const getAttemptsByModule = ({ days = 7 } = {}) =>
  get(ENDPOINTS.attemptsByModule, { days })

export const getPassRateSeries = ({ days = 14, bucket = 'day' } = {}) =>
  get(ENDPOINTS.passRateSeries, { days, bucket })

export const getPassFailBreakdown = () => get(ENDPOINTS.passFailBreakdown)
