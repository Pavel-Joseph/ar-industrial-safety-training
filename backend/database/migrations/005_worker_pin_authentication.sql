ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_workers_employee_code_active
  ON workers (employee_code, active);
