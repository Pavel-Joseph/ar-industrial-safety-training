# Backend Database Schema

## Core entities

| Table | Purpose |
|---|---|
| `users` | Administrator and safety-officer accounts |
| `workers` | People completing training |
| `modules` | Training-module identity, version and prototype pass mark |
| `assessment_rules` | Versioned scoring rules for each module step |
| `training_attempts` | One offline or online training attempt |
| `attempt_actions` | Ordered evidence recorded during an attempt |
| `assessment_results` | Authoritative backend score and pass/fail result |
| `certificates` | Certificate status and public verification identifier |
| `schema_migrations` | Records each applied SQL migration |

## Important integrity rules

- `training_attempts.attempt_id` is unique, making offline retries idempotent.
- `training_attempts.payload_hash` detects reuse of an attempt ID with different
  evidence; identical retries return the original result.
- One result can exist for each training attempt.
- One certificate can exist for each passing training attempt.
- Assessment rules are unique by module, module version, scoring version and
  step identifier.
- Day 3 scores each correct step by its configured weight. Required steps must
  be present, critical steps must be correct, and the percentage must meet the
  module pass mark. `assessment_results.scoring_details` retains the breakdown.
- The seeded Fire and Gas rules are illustrative only. Changing real rules
  requires a new scoring version and qualified safety review.
- Language values are restricted to English, Hindi and Santali codes.
- Certificate status is restricted to valid, revoked or expired.
- Certificate issue and revocation actors are recorded. Expiry is evaluated at
  read time from `expires_at`, and a public random UUID identifies each record
  without exposing the internal database ID in the QR URL.
- User passwords are stored as salted scrypt hashes, never as plaintext.

## Relationship summary

```text
workers 1 --- many training_attempts
modules 1 --- many training_attempts
modules 1 --- many assessment_rules
training_attempts 1 --- many attempt_actions
training_attempts 1 --- 1 assessment_results
training_attempts 1 --- 0..1 certificates
```
