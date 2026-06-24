-- ============================================
-- Migration 005: Admin Controls & WhatsApp Providers
-- ============================================

-- Safely add new columns to clients table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='next_billing_date') THEN
    ALTER TABLE clients ADD COLUMN next_billing_date TIMESTAMPTZ DEFAULT (now() + interval '1 month');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='whatsapp_enabled') THEN
    ALTER TABLE clients ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='whatsapp_provider') THEN
    ALTER TABLE clients ADD COLUMN whatsapp_provider TEXT DEFAULT 'ultramsg';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='whatsapp_webhook_url') THEN
    ALTER TABLE clients ADD COLUMN whatsapp_webhook_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='whatsapp_webhook_payload') THEN
    -- default generic JSON payload where {{phone}} and {{message}} will be replaced
    ALTER TABLE clients ADD COLUMN whatsapp_webhook_payload TEXT DEFAULT '{"to": "{{phone}}", "message": "{{message}}"}';
  END IF;
END $$;
