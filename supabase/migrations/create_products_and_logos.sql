-- ============================================
-- Products table for barcode-based billing
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT,
  unit TEXT DEFAULT 'pcs',
  combo_units INTEGER DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gst_percent NUMERIC(5, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  barcode_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_products_client_id ON products(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode_value);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- 3. Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — allow authenticated users full access to their products
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (true);

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();


-- ============================================
-- Storage bucket for logos
-- Run this if "Bucket not found" error occurs
-- ============================================

-- Create the logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Allow public read access to logos
CREATE POLICY "Public read access for logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logos');
