-- ============================================
-- Migration 003: Products catalog + Discount + Extra charges
-- ============================================

-- 1. Products catalog stored per client (JSONB array)
--    Each entry: { name: string, price: number, gst_percent: number }
ALTER TABLE clients ADD COLUMN products JSONB DEFAULT '[]';

-- 2. Discount fields on bills
ALTER TABLE bills
  ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN discount_value NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN discount_amount NUMERIC NOT NULL DEFAULT 0;

-- discount_type:   'none' | 'percent' | 'fixed'
-- discount_value:  the input (e.g. 10 for 10%, or 50 for ₹50)
-- discount_amount: the computed rupee amount subtracted

-- 3. Extra charges on bills (JSONB array)
--    Each entry: { label: string, amount: number }
ALTER TABLE bills ADD COLUMN extra_charges JSONB DEFAULT '[]';
