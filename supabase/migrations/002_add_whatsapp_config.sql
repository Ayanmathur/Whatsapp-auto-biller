-- ============================================
-- Migration 002: Add WhatsApp API config per client
-- ============================================
-- Each client can have their own WhatsApp API credentials.
-- Supports any provider (Ultramsg, Meta WhatsApp Business API, etc.)

ALTER TABLE clients
  ADD COLUMN whatsapp_api_url TEXT,
  ADD COLUMN whatsapp_api_key TEXT,
  ADD COLUMN whatsapp_instance_id TEXT;

-- whatsapp_api_url:       Base URL of the WhatsApp API provider
--                         e.g. https://api.ultramsg.com
--                         e.g. https://graph.facebook.com/v18.0
--
-- whatsapp_api_key:       API token / access token for the provider
--
-- whatsapp_instance_id:   Instance or Phone Number ID (provider-specific)
--                         For Ultramsg: the instance ID
--                         For Meta: the Phone Number ID
--
-- If these are NULL, the system falls back to the .env.local defaults.
