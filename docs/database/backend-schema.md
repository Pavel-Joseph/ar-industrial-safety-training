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

## Important integrity rules

- `training_attempts.attempt_id` is unique, making offline retries idempotent.
- One result can exist for each training attempt.
- One certificate can exist for each passing training attempt.
- Assessment rules are unique by module, module version, scoring version and
  step identifier.
- Language values are restricted to English, Hindi and Santali codes.
- Certificate status is restricted to valid, revoked or expired.

## Relationship summary

```text
workers 1 --- many training_attempts
modules 1 --- many training_attempts
modules 1 --- many assessment_rules
training_attempts 1 --- many attempt_actions
training_attempts 1 --- 1 assessment_results
training_attempts 1 --- 0..1 certificates
```
