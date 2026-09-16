import { MODULE_CATALOG, REQUIRED_MODULE_CODES } from '../config/modules'

/**
 * Per-worker training figures, derived from that worker's attempts.
 *
 * The backend sends these on GET /workers so the list does not need one request
 * per row. This function is the same calculation, used in local mode and as a
 * fallback if a field is missing, so the two can never disagree.
 *
 * Progress counts required modules only. The bonus mine module raises the score
 * when attempted but never makes a worker look incomplete for not doing it.
 */
export function deriveWorkerProgress(attempts = []) {
  const best = new Map()
  attempts.forEach((a) => {
    const current = best.get(a.moduleCode)
    if (!current || a.passPercent > current.passPercent) best.set(a.moduleCode, a)
  })

  const passedCodes = [...best.values()].filter((a) => a.result === 'pass').map((a) => a.moduleCode)
  const requiredPassed = passedCodes.filter((c) => REQUIRED_MODULE_CODES.includes(c))

  const scores = [...best.values()].map((a) => a.passPercent)
  const overallScorePercent = scores.length
    ? Number((scores.reduce((sum, v) => sum + v, 0) / scores.length).toFixed(1))
    : null

  return {
    modulesPassed: passedCodes.length,
    modulesTotal: MODULE_CATALOG.length,
    requiredPassed: requiredPassed.length,
    requiredTotal: REQUIRED_MODULE_CODES.length,
    progressPercent: Number(((requiredPassed.length / REQUIRED_MODULE_CODES.length) * 100).toFixed(0)),
    overallScorePercent,
    attemptsCount: attempts.length,
    lastAttemptAt: attempts.length
      ? attempts.map((a) => a.completedAt).sort().slice(-1)[0]
      : null
  }
}

/** Best attempt per module, in catalogue order, for the worker detail page. */
export function moduleBreakdownForWorker(attempts = []) {
  const best = new Map()
  attempts.forEach((a) => {
    const current = best.get(a.moduleCode)
    if (!current || a.passPercent > current.passPercent) best.set(a.moduleCode, a)
  })
  return MODULE_CATALOG.map((module) => {
    const attempt = best.get(module.code) ?? null
    return {
      ...module,
      attempt,
      state: !attempt ? 'not_started' : attempt.result === 'pass' ? 'passed' : 'failed'
    }
  })
}

/** Reads a figure the backend sent, falling back to the derived one. */
export function workerFigure(worker, key, derived) {
  return worker?.[key] ?? derived?.[key] ?? null
}
