-- Illustrative prototype responses only. A qualified safety reviewer must approve
-- real training content, correct answers, weights and critical steps.
INSERT INTO assessment_rules (
  module_id, module_version, scoring_version, step_id,
  maximum_score, correct_value, required, critical
)
VALUES
  ('fire-response', 1, 1, 'identify_exit', 20, '"safe-exit"'::jsonb, TRUE, TRUE),
  ('fire-response', 1, 1, 'extinguisher_use', 30, '"correct-sequence"'::jsonb, TRUE, FALSE),
  ('fire-response', 1, 1, 'evacuation_sequence', 50, '"assembly-point"'::jsonb, TRUE, TRUE),
  ('gas-confined-space', 1, 1, 'recognise_hazard_zone', 20, '"outside-hazard-zone"'::jsonb, TRUE, TRUE),
  ('gas-confined-space', 1, 1, 'select_ppe', 30, '"approved-ppe"'::jsonb, TRUE, FALSE),
  ('gas-confined-space', 1, 1, 'buddy_system', 50, '"buddy-confirmed"'::jsonb, TRUE, TRUE)
ON CONFLICT (module_id, module_version, scoring_version, step_id) DO NOTHING;
