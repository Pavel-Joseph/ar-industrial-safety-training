INSERT INTO modules (
  id,
  name,
  current_version,
  scoring_version,
  pass_mark,
  required
)
VALUES
  ('fire-response', 'Fire and Explosion Response', 1, 1, 70, TRUE),
  ('gas-confined-space', 'Gas Leak and Confined Space Protocol', 1, 1, 70, TRUE),
  ('jharkhand-mine-safety', 'Jharkhand Mine Worker Safety', 1, 1, 70, FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  current_version = EXCLUDED.current_version,
  scoring_version = EXCLUDED.scoring_version,
  pass_mark = EXCLUDED.pass_mark,
  required = EXCLUDED.required,
  updated_at = NOW();

INSERT INTO workers (employee_code, full_name, preferred_language)
VALUES
  ('DEMO-001', 'Demo Worker One', 'hi'),
  ('DEMO-002', 'Demo Worker Two', 'sat')
ON CONFLICT (employee_code) DO NOTHING;
