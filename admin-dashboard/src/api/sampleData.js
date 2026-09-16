/**
 * Sample records, for demonstrating the interface before real assessments exist.
 *
 * Three guarantees, and they are the reason this file is safe to ship:
 *
 * 1. Nothing here runs unless an administrator explicitly loads it from the
 *    account menu. There is no automatic seeding anywhere in the application.
 * 2. It writes only to localStore, which is browser storage. It is never sent
 *    to the backend: the dashboard has exactly one write path to the server
 *    (POST /workers from the add-worker dialog) and it does not go through here.
 * 3. The control that loads it is only rendered in local mode. With
 *    VITE_USE_LOCAL_STORE=false the option does not exist, and every screen
 *    reads from PostgreSQL instead - this module is never imported into a code
 *    path that live mode uses.
 *
 * Every record is tagged _sample: true, so removing the sample leaves any
 * worker an administrator registered themselves untouched.
 */
import { MODULE_CATALOG } from '../config/modules'
import { store } from './localStore'

/** Seeded generator: the same numbers on every load, so screenshots match. */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const PEOPLE = [
  { name: 'Ramesh Soren', site: 'Jharia Sector 4', language: 'hi' },
  { name: 'Birsa Murmu', site: 'Jharia Sector 4', language: 'sat' },
  { name: 'Anil Kumar Singh', site: 'Bokaro Washery 2', language: 'hi' },
  { name: 'Phulmani Hansda', site: 'Bokaro Washery 2', language: 'sat' },
  { name: 'Mohammad Irfan', site: 'Ramgarh Opencast', language: 'hi' },
  { name: 'Geeta Kumari', site: 'Ramgarh Opencast', language: 'hi' },
  { name: 'Lakhan Tudu', site: 'Dhanbad Central Store', language: 'sat' },
  { name: 'Sanjay Bhuiya', site: 'Dhanbad Central Store', language: 'en' }
]

/** How many attempts each worker makes in which module, and roughly how well. */
const PLAN = [
  { modules: ['fire', 'gas', 'mine'], strength: 0.86 },
  { modules: ['fire', 'gas'], strength: 0.74 },
  { modules: ['fire', 'gas', 'mine'], strength: 0.62 },
  { modules: ['fire', 'gas'], strength: 0.55 },
  { modules: ['fire', 'gas'], strength: 0.78 },
  { modules: ['fire'], strength: 0.48 },
  { modules: ['fire', 'gas'], strength: 0.68 },
  { modules: ['fire'], strength: 0.9 }
]

export function hasSampleData() {
  return store.workers().some((w) => w._sample)
}

export function loadSampleData() {
  if (hasSampleData()) return { workers: 0, attempts: 0 }

  const rand = seeded(20260916)
  const now = Date.now()
  const iso = (daysAgo, hour) => {
    const d = new Date(now - daysAgo * 864e5)
    d.setUTCHours(hour, Math.floor(rand() * 59), 0, 0)
    return d.toISOString()
  }

  const workers = []
  const attempts = []
  const certificates = []

  PEOPLE.forEach((person, i) => {
    const plan = PLAN[i]
    const worker = {
      id: `sample_wk_${i + 1}`,
      workerCode: `JH-${1001 + i}`,
      name: person.name,
      phone: `+91 9${String(400000000 + Math.floor(rand() * 99999999))}`,
      site: person.site,
      preferredLanguage: person.language,
      status: 'active',
      enrolledAt: iso(18 + i, 9),
      _sample: true
    }
    workers.push(worker)

    plan.modules.forEach((moduleCode, m) => {
      // Spread attempts across the last 13 days so the daily chart has a shape.
      const tries = rand() > 0.55 ? 2 : 1
      for (let t = 0; t < tries; t += 1) {
        const daysAgo = Math.max(0, 12 - i - m * 2 - t * 3 + Math.floor(rand() * 3))
        // A retry is the later, better attempt; a first attempt of two fails.
        const succeeds = t === tries - 1 ? rand() < plan.strength : false
        const score = succeeds
          ? 70 + Math.floor(rand() * 29)
          : 38 + Math.floor(rand() * 31)
        const durationSeconds = 200 + Math.floor(rand() * 420)
        const completedAt = iso(daysAgo, 8 + Math.floor(rand() * 8))
        const offline = rand() > 0.68

        attempts.push({
          attemptId: `sample_att_${i + 1}_${moduleCode}_${t}`,
          workerId: worker.id,
          workerName: worker.name,
          workerCode: worker.workerCode,
          moduleCode,
          score,
          maxScore: 100,
          passPercent: Number(score.toFixed(1)),
          result: score >= 70 ? 'pass' : 'fail',
          durationSeconds,
          scoringVersion: moduleCode === 'mine' ? '0.9.0' : '1.0.0',
          language: worker.preferredLanguage,
          startedAt: new Date(new Date(completedAt).getTime() - durationSeconds * 1000).toISOString(),
          completedAt,
          receivedAt: offline
            ? new Date(new Date(completedAt).getTime() + 3.6e6).toISOString()
            : completedAt,
          source: offline ? 'offline_sync' : 'online',
          certificateId: null,
          _sample: true
        })
      }
    })
  })

  attempts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

  // A certificate exists only for a passing attempt, exactly as the backend rule.
  attempts
    .filter((a) => a.result === 'pass')
    .forEach((attempt, index) => {
      const certificateId = `AR-${attempt.moduleCode.toUpperCase()}-2026-${1001 + index}`
      attempt.certificateId = certificateId
      certificates.push({
        certificateId,
        workerId: attempt.workerId,
        workerName: attempt.workerName,
        workerCode: attempt.workerCode,
        moduleCode: attempt.moduleCode,
        attemptId: attempt.attemptId,
        issuedAt: attempt.receivedAt,
        expiresAt: null,
        status: index % 9 === 0 ? 'revoked' : 'valid',
        verifyUrl: `${window.location.origin}/verify/${certificateId}`,
        _sample: true
      })
    })

  store.setWorkers([...store.workers(), ...workers])
  store.setAttempts([...store.attempts(), ...attempts])
  store.setCertificates([...store.certificates(), ...certificates])

  return { workers: workers.length, attempts: attempts.length, modules: MODULE_CATALOG.length }
}

/** Removes only the tagged records. Anything registered by hand is kept. */
export function removeSampleData() {
  store.setWorkers(store.workers().filter((w) => !w._sample))
  store.setAttempts(store.attempts().filter((a) => !a._sample))
  store.setCertificates(store.certificates().filter((c) => !c._sample))
}
