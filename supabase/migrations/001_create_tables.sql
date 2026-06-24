-- ============================================
-- Billing System — Supabase Schema Migration
-- ============================================

-- 1. Create custom enum for bill sizes
CREATE TYPE bill_size AS ENUM ('A4', 'A5', 'thermal_80mm', 'thermal_58mm');

-- ============================================
-- 2. Clients Table
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  gst_number TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  logo_url TEXT,
  bill_size bill_size NOT NULL DEFAULT 'A4',
  whatsapp_message_template TEXT NOT NULL DEFAULT 'Thank you for your purchase, {customer_name}! We appreciate your business.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Bills Table
-- ============================================
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Indexes
-- ============================================
CREATE INDEX idx_bills_client_id ON bills(client_id);
CREATE INDEX idx_bills_customer_phone ON bills(customer_phone);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);

-- ============================================
-- 5. Auto-generate bill_number
-- ============================================
-- Sequence for bill numbering per client
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  prefix TEXT;
BEGIN
  -- Get the count of existing bills for this client + 1
  SELECT COUNT(*) + 1 INTO next_num
  FROM bills
  WHERE client_id = NEW.client_id;

  -- Get shop name prefix (first 3 chars uppercase)
  SELECT UPPER(LEFT(REGEXP_REPLACE(shop_name, '[^a-zA-Z]', '', 'g'), 3)) INTO prefix
  FROM clients
  WHERE id = NEW.client_id;

  -- Format: PREFIX-YYYYMMDD-0001
  NEW.bill_number := prefix || '-' || TO_CHAR(NEW.bill_date, 'YYYYMMDD') || '-' || LPAD(next_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_bill_number
  BEFORE INSERT ON bills
  FOR EACH ROW
  WHEN (NEW.bill_number IS NULL OR NEW.bill_number = '')
  EXECUTE FUNCTION generate_bill_number();

-- ============================================
-- 6. RLS Policies (permissive — adjust as needed)
-- ============================================

-- Allow authenticated users full access to clients
CREATE POLICY "Allow authenticated read on clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users full access to bills
CREATE POLICY "Allow authenticated read on bills"
  ON bills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on bills"
  ON bills FOR DELETE
  TO authenticated
  USING (true);

-- Allow service role to bypass RLS (already default, but explicit)
CREATE POLICY "Allow service role full access on clients"
  ON clients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access on bills"
  ON bills FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
