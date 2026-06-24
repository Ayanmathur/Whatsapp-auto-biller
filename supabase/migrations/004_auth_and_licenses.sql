-- ============================================
-- Migration 004: Authentication & License Keys
-- ============================================

-- 1. App config table (admin password, settings)
-- Editable directly in Supabase Dashboard
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default admin password (change this in Supabase Dashboard)
INSERT INTO app_config (key, value) VALUES
  ('admin_password', 'admin123'),
  ('admin_whatsapp', '919422880355')
ON CONFLICT (key) DO NOTHING;

-- 2. License keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  client_name TEXT,
  username TEXT,
  user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (via service role key, bypasses RLS)

-- 3. Add user_id and username to clients safely
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='user_id') THEN
    ALTER TABLE clients ADD COLUMN user_id UUID;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='username') THEN
    ALTER TABLE clients ADD COLUMN username TEXT;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_clients_user_id;
CREATE UNIQUE INDEX idx_clients_user_id ON clients(user_id) WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_clients_username;
CREATE UNIQUE INDEX idx_clients_username ON clients(username) WHERE username IS NOT NULL;
