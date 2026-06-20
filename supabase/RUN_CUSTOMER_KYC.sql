-- =============================================================================
-- RYDEZ INDIA — Rider customer_kyc + customer-kyc storage (Supabase SQL Editor)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customer_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  driving_license_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS driving_license_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS license_url TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.customer_kyc ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.customer_kyc
SET aadhaar_front_url = COALESCE(aadhaar_front_url, aadhaar_url)
WHERE aadhaar_front_url IS NULL AND aadhaar_url IS NOT NULL;

UPDATE public.customer_kyc
SET driving_license_url = COALESCE(driving_license_url, license_url)
WHERE driving_license_url IS NULL AND license_url IS NOT NULL;

UPDATE public.customer_kyc SET status = 'pending' WHERE status IS NULL OR status = 'not_submitted';
UPDATE public.customer_kyc SET status = 'approved' WHERE status = 'verified';

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_kyc_user_id_fkey') THEN
      BEGIN
        ALTER TABLE public.customer_kyc
          ADD CONSTRAINT customer_kyc_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'customer_kyc_user_id_fkey skipped: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

ALTER TABLE public.customer_kyc DROP CONSTRAINT IF EXISTS customer_kyc_status_check;

CREATE INDEX IF NOT EXISTS idx_customer_kyc_user_id ON public.customer_kyc (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_kyc_status ON public.customer_kyc (status);

ALTER TABLE public.customer_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages customer kyc" ON public.customer_kyc;
CREATE POLICY "Service role manages customer kyc" ON public.customer_kyc
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own customer kyc" ON public.customer_kyc;
CREATE POLICY "Users read own customer kyc" ON public.customer_kyc
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-kyc', 'customer-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Service role manages customer kyc storage" ON storage.objects;
CREATE POLICY "Service role manages customer kyc storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'customer-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'customer-kyc' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read customer kyc" ON storage.objects;
CREATE POLICY "Public read customer kyc"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-kyc');

NOTIFY pgrst, 'reload schema';
