ALTER TABLE assessment_rules
  ADD COLUMN IF NOT EXISTS critical BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE training_attempts
  ADD COLUMN IF NOT EXISTS payload_hash TEXT;

ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS scoring_details JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_assessment_results_evaluated_at
  ON assessment_results(evaluated_at DESC);
