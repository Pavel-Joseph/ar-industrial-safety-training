# Backend API

Backend foundation for the AR Industrial Safety Training Platform. It provides
the Express API, PostgreSQL access, assessment processing, offline-result sync,
and DGMS-aligned certificate verification.

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

## Day 1 scope

Day 1 defines the system boundaries and data contract. Authentication,
assessment calculation, result sync, QR generation and certificate issuance are
represented in the schema and API contract but are implemented on later days.

Certificates must be described as DGMS-aligned competency-based certificates.
The prototype must not claim that DGMS issued, approved or accredited them.
