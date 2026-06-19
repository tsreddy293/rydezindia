-- =============================================================================
-- RYDEZ INDIA — owner_profiles table + KYC document columns + storage bucket
-- Supabase → SQL Editor → New query → Paste → Run
-- Safe to run multiple times.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  pan_number TEXT,
  gst_number TEXT,
  bank_account TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  license_number TEXT,
  aadhaar_number TEXT,
  aadhaar_document_url TEXT,
  license_document_url TEXT,
  selfie_document_url TEXT,
  address_proof_url TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'not_submitted',
  kyc_approved_at TIMESTAMPTZ,
  kyc_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_profiles_user_id ON public.owner_profiles (user_id);

ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS aadhaar_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS selfie_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS address_proof_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages profiles" ON public.owner_profiles;
CREATE POLICY "Service role manages profiles" ON public.owner_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Owners read own profile" ON public.owner_profiles;
CREATE POLICY "Owners read own profile" ON public.owner_profiles
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-kyc', 'owner-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Owners upload owner kyc" ON storage.objects;
CREATE POLICY "Owners upload owner kyc"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'owner-kyc'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Owners update own owner kyc" ON storage.objects;
CREATE POLICY "Owners update own owner kyc"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'owner-kyc'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Public read owner kyc" ON storage.objects;
CREATE POLICY "Public read owner kyc"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'owner-kyc');

DROP POLICY IF EXISTS "Service role manages owner kyc storage" ON storage.objects;
CREATE POLICY "Service role manages owner kyc storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'owner-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'owner-kyc' AND auth.role() = 'service_role');

-- Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';

-- ======================== END — STOP COPYING HERE ========================
