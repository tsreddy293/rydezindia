-- =============================================================================
-- RYDEZ INDIA — Create public.customer_kyc (fixes PGRST205)
-- Run in Supabase SQL Editor: paste all → Run
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
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  reviewed_by UUID,
  remarks TEXT,
  self_drive_return_path TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_kyc_user ON public.customer_kyc (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_kyc_status ON public.customer_kyc (status);

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

ALTER TABLE public.customer_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages customer kyc" ON public.customer_kyc;
CREATE POLICY "Service role manages customer kyc"
  ON public.customer_kyc
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own customer kyc" ON public.customer_kyc;
CREATE POLICY "Users read own customer kyc"
  ON public.customer_kyc
  FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

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
