ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_certificates_issued_at
  ON certificates(issued_at DESC);
