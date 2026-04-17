CREATE TABLE IF NOT EXISTS departments (
  code          VARCHAR(32) PRIMARY KEY,
  name          VARCHAR(256) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing departments
INSERT INTO departments (code, name) VALUES
  ('CARD', 'Cardiology'),
  ('GEN', 'General Medicine')
ON CONFLICT (code) DO NOTHING;
