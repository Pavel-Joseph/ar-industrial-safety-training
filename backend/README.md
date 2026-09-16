# Backend API

Backend foundation for the AR Industrial Safety Training Platform. It currently
provides the Express API, PostgreSQL access, administrator authentication, and
protected worker, module, and assessment-result reads. Day 3 adds a protected
attempt-submission endpoint that calculates and stores an assessment result.
Worker-app authentication and DGMS-aligned certificate verification follow in
later workflows.

## Day 1 setup

1. Copy `.env.example` to `.env` and replace local values.
2. Create a PostgreSQL database named `ar_safety_training`.
3. Install dependencies with `npm install`.
4. Apply the schema with `npm run db:migrate`.
5. Load optional demonstration data with `npm run db:seed`.
6. Start development mode with `npm run dev`.

The API listens on `http://localhost:3000` by default.

## Verification

```text
GET http://localhost:3000/
GET http://localhost:3000/api/health
```

The health endpoint returns `200` when PostgreSQL is available and `503` when
the API is running but the database is unavailable.

Run the application tests with `npm test`.

## Day 2 authentication

Set `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` in `.env`, then run:

```text
npm run db:migrate
npm run db:seed
```

Log in with `POST /api/auth/login`. Send the returned access token to protected
routes using `Authorization: Bearer <token>`.

Day 2 protected routes:

```text
GET  /api/workers
POST /api/workers
GET  /api/workers/:workerId
GET  /api/modules
GET  /api/modules/:moduleId
GET  /api/results
GET  /api/results/:attemptId
```

## Day 3 assessment engine

Run `npm run db:migrate` and `npm run db:seed` after restoring your local
`DATABASE_URL` in `.env`. The new seed adds **illustrative prototype scoring
rules** for Fire & Explosion Response and Gas Leak & Confined Space Protocol.
The optional Jharkhand module has no scoring rules yet and cannot be submitted.

`POST /api/attempts/sync` accepts an attempt with a client-generated UUID,
ordered actions, module/scoring versions and timestamps. It checks the worker,
active module version and rules, then writes the evidence and evaluated result
in one transaction. Repeating the same payload and attempt ID returns the
stored result without another attempt; using that ID with different evidence
returns `409`. Scores and per-step feedback are available from `/api/results`.

For the Day 3 prototype, submission requires an admin or safety-officer Bearer
token. Do not embed an admin token in the Android app. Worker-app authentication
and offline queue integration remain separate work.

Run `npm test` for unit/API checks. With a configured local PostgreSQL database,
run `$env:RUN_DB_TESTS='1'; npm test` in PowerShell for the write-and-retry
integration test; it cleans up its own records.

## Scope boundary

Days 1–3 define the system boundaries, data contract, authentication, scoring,
and the first dashboard-facing APIs. Worker-app authentication, an Android
offline queue, QR generation and certificate issuance remain later work.

Certificates must be described as DGMS-aligned competency-based certificates.
The prototype must not claim that DGMS issued, approved or accredited them.
