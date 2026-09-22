# Backend API Contract

## Conventions

- Base path: `/api`
- Format: JSON over HTTPS outside local development
- Identifiers: UUIDs generated before offline attempts are queued
- Timestamps: ISO 8601 in UTC
- Languages: `en`, `hi`, `sat`
- Roles: `admin`, `safety_officer`, and mobile-app `worker`

Successful collection responses use a `data` array and optional `meta` object.
Errors use the following shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "requestId": "uuid",
    "details": []
  }
}
```

## Implemented endpoints

### `GET /`

Identifies the service and links to the health endpoint.

### `GET /api/health`

Returns `200` when the API and PostgreSQL are available. Returns `503` with a
degraded state when the API is running but PostgreSQL cannot be reached.

### `POST /api/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "the-password-configured-during-seeding"
}
```

### `POST /api/auth/worker-login`

The mobile training app authenticates an active worker with the employee code
and 4–8 digit PIN configured by an administrator.

```json
{ "employeeCode": "JH-1001", "pin": "1234" }
```

The response contains `data.accessToken`, `data.expiresIn`, and `data.worker`.
The worker token may read active module metadata and submit attempts only when
the payload `workerId` equals the authenticated worker ID.

Administrators configure or reset a PIN with:

```text
PATCH /api/workers/:workerId/pin
```

```json
{ "pin": "1234" }
```

The response includes a Bearer access token, expiry in seconds and the user's
ID, email and role. Use the token on protected endpoints:

```text
Authorization: Bearer <accessToken>
```

### Worker endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/workers` | Admin or safety officer |
| POST | `/api/workers` | Admin or safety officer |
| PATCH | `/api/workers/:workerId/pin` | Admin |
| GET | `/api/workers/:workerId` | Admin or safety officer |

Worker lists accept `search`, `active`, `limit` and `offset` query parameters.
The maximum page size is 100.

Create-worker request:

```json
{
  "employeeCode": "MINE-001",
  "fullName": "Example Worker",
  "preferredLanguage": "hi",
  "pin": "1234"
}
```

### Module endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/modules` | Admin, safety officer, or worker |
| GET | `/api/modules/:moduleId` | Admin, safety officer, or worker |

### Assessment-result endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/results` | Admin or safety officer |
| GET | `/api/results/:attemptId` | Admin or safety officer |

Result lists accept `workerId`, `moduleId`, `passed`, `limit` and `offset` query
parameters. Results include the backend score, pass/fail status and per-step
scoring details.

### `POST /api/attempts/sync`

Day 3 submission is restricted to an admin or safety-officer Bearer token. It
evaluates synchronously and stores the attempt, actions and result in one
transaction. This endpoint is not yet an Android worker authentication flow;
the app must not contain an admin token.

The first accepted submission returns `201`. Repeating the same attempt ID and
evidence returns `200` and the stored score. Reusing the ID with different
evidence returns `409 ATTEMPT_ID_CONFLICT`. A missing worker or module returns
`404`; an inactive worker/module, version mismatch or unconfigured rules
returns `409`. Unknown steps return `422`.

### Certificate endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/certificates` | Admin or safety officer | Issue for a passing attempt |
| GET | `/api/certificates` | Admin or safety officer | List and filter |
| GET | `/api/certificates/:id` | Admin or safety officer | Certificate detail |
| GET | `/api/certificates/:id/qr.svg` | Admin or safety officer | Download verification QR |
| GET | `/api/certificates/:id/document.html` | Admin or safety officer | Printable certificate with embedded QR |
| PATCH | `/api/certificates/:id/status` | Admin | Revoke with a reason |
| GET | `/api/verify/:publicId` | Public | Current verification status as JSON |
| GET | `/verify/:publicId` | Public | Human-readable verification page |

Issuance request:

```json
{
  "attemptId": "7ff03331-8b53-43c8-af38-9ac67b30e13a",
  "expiresAt": "2027-09-17T00:00:00.000Z"
}
```

The backend creates one certificate per validated passing attempt. Repeating
the same request returns that certificate. A different expiry for the same
attempt returns `409 CERTIFICATE_EXISTS`. The QR contains only the public
verification URL, not a claim of government approval. The public response
exposes a worker name, module, score and validity dates; keep this in mind when
distributing certificates. Certificate lists accept `workerId`, `moduleId`,
`status`, `limit` and `offset` filters.

Certificate responses include `id`, `publicId`, `status`, `verificationUrl`,
`qrSvgUrl` and `documentHtmlUrl`, along with worker, module, score, issue and
expiry details. The SVG and printable document routes require a Bearer token;
the dashboard should fetch them through its authenticated API client.

Revocation request:

```json
{ "status": "revoked", "reason": "Issued in error" }
```

The public endpoint checks the database on each request and reports `valid`,
`expired` or `revoked`. A valid result only verifies this project's training
record. Set `PUBLIC_BASE_URL` to a reachable HTTPS origin before creating QR
codes for phones; the local default points to the backend computer only.

## Planned endpoints

| Method | Path | Purpose | Planned day |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Provide dashboard totals | 5 |

## Offline attempt contract

The Unity app creates `attemptId` before saving an offline result. The backend
uses it as an idempotency key, so retrying the same request must not create a
second attempt.

```json
{
  "attemptId": "7ff03331-8b53-43c8-af38-9ac67b30e13a",
  "workerId": "c0d6309f-3956-48ee-ad90-264de676e917",
  "moduleId": "fire-response",
  "moduleVersion": 1,
  "scoringVersion": 1,
  "languageCode": "hi",
  "startedAt": "2026-09-14T08:30:00.000Z",
  "completedAt": "2026-09-14T08:38:00.000Z",
  "deviceMetadata": {
    "platform": "Android"
  },
  "actions": [
    {
      "stepId": "identify_exit",
      "selectedValue": "safe-exit",
      "occurredAt": "2026-09-14T08:31:10.000Z",
      "sequenceNumber": 0
    },
    {
      "stepId": "extinguisher_use",
      "selectedValue": "correct-sequence",
      "occurredAt": "2026-09-14T08:33:10.000Z",
      "sequenceNumber": 1
    },
    {
      "stepId": "evacuation_sequence",
      "selectedValue": "assembly-point",
      "occurredAt": "2026-09-14T08:36:10.000Z",
      "sequenceNumber": 2
    }
  ]
}
```

Successful assessment acknowledgement:

```json
{
  "data": {
    "attemptId": "7ff03331-8b53-43c8-af38-9ac67b30e13a",
    "syncStatus": "accepted",
    "resultStatus": "evaluated",
    "certificateStatus": "not-issued",
    "score": {
      "total": 100,
      "maximum": 100,
      "percentage": 100,
      "passed": true
    }
  }
}
```

The passing mark and correct responses in the demonstration seed are prototype
values. Required steps must be present, critical steps must be correct, and
the score must meet the pass mark. Final rules must be reviewed with qualified
safety-domain stakeholders and versioned before use. Certificates must use
DGMS-aligned wording and must not be represented as official DGMS certification.
