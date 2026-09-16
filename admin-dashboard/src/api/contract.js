/**
 * SHARED DATA CONTRACT - v1
 *
 * This file is documentation that the editor can check. Person 2 owns the
 * contract; this is Person 3's copy of it. If a field here disagrees with the
 * backend, fix it here first and tell the team, never patch it inside a page.
 *
 * Conventions agreed with Person 2:
 *  - All timestamps are ISO 8601 UTC strings ending in Z.
 *  - All percentages are numbers 0-100 (not 0-1), rounded to one decimal.
 *  - Durations are whole seconds.
 *  - attemptId is generated on the phone (UUID v4) and is the deduplication key
 *    for offline sync, so the same attempt uploaded twice must never appear twice.
 *  - Errors always use: { "error": { "code": "...", "message": "...", "details": {} } }
 *
 * @typedef {Object} AdminUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'admin'|'viewer'} role
 *
 * @typedef {Object} LoginResponse
 * @property {string} token           JWT, sent as `Authorization: Bearer <token>`
 * @property {string} expiresAt
 * @property {AdminUser} user
 *
 * @typedef {Object} TrainingModule
 * @property {string} id
 * @property {'fire'|'gas'|'mine'} code
 * @property {{en: string, hi: string, sat: string}} title
 * @property {number} passPercent     Pass threshold, e.g. 70
 * @property {string} scoringVersion  e.g. "1.0.0"
 *
 * @typedef {Object} Worker
 * @property {string} id
 * @property {string} workerCode      Human-readable, printed on the certificate
 * @property {string} name
 * @property {string} phone
 * @property {string} site
 * @property {'en'|'hi'|'sat'} preferredLanguage
 * @property {string} enrolledAt
 * @property {'active'|'inactive'} status
 * @property {number} attemptsCount
 * @property {string|null} lastAttemptAt
 *
 * Training figures. The backend sends these on the list endpoint so the table
 * needs one request, not one per row. The dashboard derives the same numbers
 * from the worker's attempts as a fallback (see lib/progress.js), so the two
 * must use the same rule: progress counts required modules passed.
 * @property {number} modulesPassed
 * @property {number} modulesTotal
 * @property {number} requiredPassed
 * @property {number} requiredTotal
 * @property {number} progressPercent      0-100, required modules passed
 * @property {number|null} overallScorePercent  mean of best score per module
 * @property {number} certificatesCount
 *
 * @typedef {Object} CreateWorkerRequest
 * POST /workers. The only write the dashboard performs.
 * @property {string} name                 required
 * @property {string} [workerCode]         server assigns the next one if omitted
 * @property {string} [phone]
 * @property {string} [site]
 * @property {'en'|'hi'|'sat'} [preferredLanguage]
 *
 * Responds 201 with the created Worker, 409 WORKER_CODE_TAKEN on a duplicate
 * code, 422 VALIDATION_FAILED with details keyed by field name.
 *
 * @typedef {Object} AttemptsByModule
 * @property {number} days
 * @property {Array<{moduleCode: string, label: string, attempts: number, passed: number, failed: number}>} modules
 *
 * @typedef {Object} Attempt
 * @property {string} attemptId       UUID from the phone
 * @property {string} workerId
 * @property {string} workerName      Denormalised so the table needs one call
 * @property {string} workerCode
 * @property {'fire'|'gas'|'mine'} moduleCode
 * @property {number} score
 * @property {number} maxScore
 * @property {number} passPercent     score/maxScore as 0-100
 * @property {'pass'|'fail'} result   Decided by the backend, never by the client
 * @property {number} durationSeconds
 * @property {string} scoringVersion
 * @property {'en'|'hi'|'sat'} language
 * @property {string} startedAt
 * @property {string} completedAt     When the worker finished, on the phone
 * @property {string} receivedAt      When the backend stored it
 * @property {'online'|'offline_sync'} source
 * @property {string|null} certificateId
 *
 * @typedef {Object} Certificate
 * @property {string} certificateId   e.g. "AR-FIRE-2026-000184"
 * @property {string} workerId
 * @property {string} workerName
 * @property {string} workerCode
 * @property {'fire'|'gas'|'mine'} moduleCode
 * @property {string} attemptId
 * @property {string} issuedAt
 * @property {string|null} expiresAt
 * @property {'valid'|'revoked'|'expired'} status
 * @property {string} verifyUrl       Exactly the string encoded in the QR code
 *
 * @typedef {Object} Paged
 * @property {Array<any>} data
 * @property {number} page
 * @property {number} pageSize
 * @property {number} total
 *
 * @typedef {Object} OverviewSummary
 * @property {{total: number, activeLast7Days: number}} workers
 * @property {{total: number, today: number, offlineSynced: number}} attempts
 * @property {{overallPassPercent: number}} performance
 * @property {{issued: number, revoked: number}} certificates
 *
 * @typedef {Object} PassRatePoint
 * Each module key is optional: a module with no attempts that day is absent.
 * @property {string} date            "YYYY-MM-DD"
 * @property {{attempts: number, passed: number, passPercent: number}} [fire]
 * @property {{attempts: number, passed: number, passPercent: number}} [gas]
 * @property {{attempts: number, passed: number, passPercent: number}} [mine]
 *
 * @typedef {Object} PassRateSeries
 * @property {'day'|'week'} bucket
 * @property {Array<'fire'|'gas'|'mine'>} modules
 * @property {PassRatePoint[]} points
 *
 * @typedef {Object} ModuleBreakdown
 * @property {'fire'|'gas'|'mine'} moduleCode
 * @property {string} label
 * @property {number} attempts
 * @property {number} passed
 * @property {number} failed
 * @property {number} passPercent
 * @property {number} failPercent     passPercent + failPercent === 100
 *
 * @typedef {Object} PassFailBreakdown
 * @property {ModuleBreakdown[]} modules
 * @property {{attempts: number, passed: number, failed: number, passPercent: number, failPercent: number}} totals
 */

export const ENDPOINTS = {
  login: '/auth/login',
  me: '/auth/me',
  modules: '/modules',
  workers: '/workers',            // GET list, POST register a worker
  worker: (id) => `/workers/${id}`,
  attempts: '/attempts',
  certificates: '/certificates',
  revokeCertificate: (id) => `/certificates/${id}/revoke`,
  verify: (id) => `/verify/${id}`,
  overview: '/summary/overview',
  attemptsByModule: '/summary/attempts-by-module',
  passRateSeries: '/summary/pass-rate-series',
  passFailBreakdown: '/summary/pass-fail-breakdown'
}


export const LANGUAGE_LABELS = { en: 'English', hi: 'हिन्दी', sat: 'ᱥᱟᱱᱛᱟᱲᱤ' }
