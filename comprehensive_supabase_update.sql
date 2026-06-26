-- 1. Ensure the 'logos' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;

-- Create policy to allow public viewing of logos
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'logos' );

-- Create policy to allow authenticated users to upload logos
CREATE POLICY "Auth Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'logos' AND auth.role() = 'authenticated' );

-- Create policy to allow authenticated users to update logos
CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'logos' AND auth.role() = 'authenticated' );

-- 2. Ensure 'products' table has all the latest columns
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    size text,
    unit text DEFAULT 'pcs',
    combo_units integer DEFAULT 1,
    price numeric DEFAULT 0,
    gst_percent integer DEFAULT 0,
    stock integer DEFAULT 0,
    barcode_value text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- In case the table already existed but was missing the new columns, let's add them safely
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS combo_units integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;

-- 3. Ensure 'bills' table has the discount and extra charges columns
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_charges jsonb DEFAULT '[]'::jsonb;
