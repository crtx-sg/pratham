CREATE TABLE IF NOT EXISTS doctors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(256) NOT NULL,
  department    VARCHAR(32) NOT NULL,
  phone         VARCHAR(20) UNIQUE,
  pin_hash      VARCHAR(128) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure phone is unique (for existing DBs)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctors_phone_key'
  ) THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Add doctor assignment to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES doctors(id);

-- Track which doctor gave feedback
ALTER TABLE session_reports ADD COLUMN IF NOT EXISTS feedback_doctor_id UUID REFERENCES doctors(id);

-- Seed demo doctors (PIN: 1234, SHA-256 hashed)
INSERT INTO doctors (name, department, phone, pin_hash) VALUES
  ('Dr. Priya Sharma', 'CARD', '9876500001', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('Dr. Anil Reddy', 'CARD', '9876500002', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'),
  ('Dr. Kavitha Menon', 'GEN', '9876500003', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
ON CONFLICT (phone) DO NOTHING;
