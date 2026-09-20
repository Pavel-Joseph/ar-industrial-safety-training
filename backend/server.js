'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ACTIONS = [
  'exit_identified', 'extinguisher_selected', 'aim_selected',
  'spray_completed', 'evacuation_started', 'evac_exit', 'assembly_reached'
];

function assess(attempt) {
  if (!attempt || !/^[a-f0-9]{32}$/i.test(attempt.attemptId || '') ||
      typeof attempt.workerId !== 'string' || !attempt.workerId.trim() ||
      attempt.workerId.length > 64 || attempt.moduleId !== 'fire-response' ||
      attempt.scoringVersion !== 'fire-v1' ||
      !Number.isFinite(attempt.totalDurationSeconds) ||
      attempt.totalDurationSeconds < 0 || attempt.totalDurationSeconds > 3600 ||
      !Array.isArray(attempt.events) || attempt.events.length > 500) {
    return { error: 'Invalid Fire attempt fields' };
  }

  let next = 0;
  let mistakes = 0;
  let previousTime = -1;
  for (const event of attempt.events) {
    if (!event || typeof event.key !== 'string' ||
        typeof event.correct !== 'boolean' ||
        !Number.isFinite(event.elapsedSeconds) ||
        event.elapsedSeconds < previousTime ||
        event.elapsedSeconds > attempt.totalDurationSeconds + 1) {
      return { error: 'Invalid or unordered action event' };
    }
    previousTime = event.elapsedSeconds;
    if (!event.correct) mistakes++;
    if (event.correct && REQUIRED_ACTIONS.includes(event.key)) {
      if (event.key !== REQUIRED_ACTIONS[next])
        return { error: 'Fire actions are out of order' };
      next++;
    }
  }
  if (next !== REQUIRED_ACTIONS.length)
    return { error: 'Fire attempt is incomplete' };

  const score = Math.max(0, 100 - mistakes * 10);
  if (attempt.score !== score || attempt.passed !== (score >= 70) ||
      attempt.incorrectSelections !== mistakes ||
      attempt.sprayPracticeCompleted !== true) {
    return { error: 'Client assessment does not match action events' };
  }
  return { score, passed: score >= 70 };
}

function createServer(dataFile = path.join(__dirname, 'data', 'attempts.json')) {
  const attempts = new Map();
  if (fs.existsSync(dataFile)) {
    for (const attempt of JSON.parse(fs.readFileSync(dataFile, 'utf8')))
      attempts.set(attempt.attemptId, attempt);
  }

  return http.createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    const send = (status, value) => {
      response.writeHead(status);
      response.end(JSON.stringify(value));
    };
    if (request.method === 'OPTIONS') return send(204, {});
    if (request.method === 'GET' && request.url === '/health')
      return send(200, { ok: true, attempts: attempts.size });
    if (request.method === 'GET' && request.url.startsWith('/api/attempts/')) {
      const id = request.url.slice('/api/attempts/'.length);
      const attempt = attempts.get(id);
      return attempt ? send(200, attempt) : send(404, { error: 'Attempt not found' });
    }
    if (request.method !== 'POST' || request.url !== '/api/attempts')
      return send(404, { error: 'Route not found' });

    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 128000) request.destroy();
    });
    request.on('end', () => {
      let attempt;
      try { attempt = JSON.parse(body); }
      catch { return send(400, { error: 'Invalid JSON' }); }
      const result = assess(attempt);
      if (result.error) return send(400, result);

      const existing = attempts.get(attempt.attemptId);
      if (existing) {
        if (existing.workerId !== attempt.workerId || existing.score !== attempt.score ||
            existing.totalDurationSeconds !== attempt.totalDurationSeconds ||
            JSON.stringify(existing.events) !== JSON.stringify(attempt.events))
          return send(409, { error: 'Attempt ID already belongs to a different result' });
        return send(200, { accepted: true, duplicate: true,
          attemptId: attempt.attemptId, score: existing.score });
      }

      const stored = { ...attempt, syncState: 'synced', receivedAtUtc: new Date().toISOString() };
      attempts.set(attempt.attemptId, stored);
      try {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        const tempFile = dataFile + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify([...attempts.values()], null, 2));
        fs.renameSync(tempFile, dataFile);
      } catch (error) {
        attempts.delete(attempt.attemptId);
        return send(500, { error: 'Could not persist attempt' });
      }
      return send(201, { accepted: true, duplicate: false,
        attemptId: attempt.attemptId, score: result.score });
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '0.0.0.0', () =>
    console.log(`Fire attempt API listening on port ${port}`));
}

module.exports = { assess, createServer };
