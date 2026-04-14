CREATE TABLE IF NOT EXISTS doctors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(256) NOT NULL,
  department    VARCHAR(32) NOT NULL,
  phone         VARCHAR(20),
  pin_hash      VARCHAR(128) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add doctor assignment to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES doctors(id);

-- Track which doctor gave feedback
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS feedback_doctor_id UUID REFERENCES doctors(id);

-- Seed demo doctors (PIN: 1234 hashed with SHA-256)
-- In production, use bcrypt. For POC, SHA-256 of '1234' = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
INSERT INTO doctors (name, department, phone, pin_hash) VALUES
  ('Dr. Priya Sharma', 'CARD', '9876500001', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('Dr. Anil Reddy', 'CARD', '9876500002', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('Dr. Kavitha Menon', 'GEN', '9876500003', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
ON CONFLICT DO NOTHING;
