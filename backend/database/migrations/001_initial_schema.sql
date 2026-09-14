CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'safety_officer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'hi', 'sat')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  current_version INTEGER NOT NULL CHECK (current_version > 0),
  scoring_version INTEGER NOT NULL CHECK (scoring_version > 0),
  pass_mark NUMERIC(5, 2) NOT NULL CHECK (pass_mark BETWEEN 0 AND 100),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL REFERENCES modules(id),
  module_version INTEGER NOT NULL CHECK (module_version > 0),
  scoring_version INTEGER NOT NULL CHECK (scoring_version > 0),
  step_id TEXT NOT NULL,
  maximum_score NUMERIC(7, 2) NOT NULL CHECK (maximum_score >= 0),
  correct_value JSONB,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, module_version, scoring_version, step_id)
);

CREATE TABLE IF NOT EXISTS training_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL UNIQUE,
  worker_id UUID NOT NULL REFERENCES workers(id),
  module_id TEXT NOT NULL REFERENCES modules(id),
  module_version INTEGER NOT NULL CHECK (module_version > 0),
  scoring_version INTEGER NOT NULL CHECK (scoring_version > 0),
  language_code TEXT NOT NULL CHECK (language_code IN ('en', 'hi', 'sat')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'validated', 'rejected')),
  device_metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE IF NOT EXISTS attempt_actions (
  id BIGSERIAL PRIMARY KEY,
  training_attempt_id UUID NOT NULL REFERENCES training_attempts(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  selected_value JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  sequence_number INTEGER NOT NULL CHECK (sequence_number >= 0),
  UNIQUE (training_attempt_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS assessment_results (
  training_attempt_id UUID PRIMARY KEY
    REFERENCES training_attempts(id) ON DELETE CASCADE,
  total_score NUMERIC(7, 2) NOT NULL CHECK (total_score >= 0),
  maximum_score NUMERIC(7, 2) NOT NULL CHECK (maximum_score > 0),
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_verification_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  training_attempt_id UUID NOT NULL UNIQUE
    REFERENCES training_attempts(id),
  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'revoked', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_attempts_worker
  ON training_attempts(worker_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_attempts_module
  ON training_attempts(module_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificates_status
  ON certificates(status);
