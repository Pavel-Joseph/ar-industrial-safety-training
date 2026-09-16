# Backend API Contract

## Conventions

- Base path: `/api`
- Format: JSON over HTTPS outside local development
- Identifiers: UUIDs generated before offline attempts are queued
- Timestamps: ISO 8601 in UTC
- Languages: `en`, `hi`, `sat`
- Roles: `admin`, `safety_officer`

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
| GET | `/api/workers/:workerId` | Admin or safety officer |

Worker lists accept `search`, `active`, `limit` and `offset` query parameters.
The maximum page size is 100.

Create-worker request:

```json
{
  "employeeCode": "MINE-001",
  "fullName": "Example Worker",
  "preferredLanguage": "hi"
}
```

### Module endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/modules` | Admin or safety officer |
| GET | `/api/modules/:moduleId` | Admin or safety officer |

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

## Planned endpoints

| Method | Path | Purpose | Planned day |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Provide dashboard totals | 5 |
| GET | `/api/certificates` | List certificates for administrators | 4 |
| GET | `/api/verify/:publicId` | Publicly verify a certificate | 4 |
| PATCH | `/api/certificates/:id/status` | Revoke or update a certificate | 4 |

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
