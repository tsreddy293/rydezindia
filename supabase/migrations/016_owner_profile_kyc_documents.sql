-- Owner KYC document URLs on owner_profiles (creates table if missing)

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
  kyc_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_profiles_user_id ON public.owner_profiles (user_id);

ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS aadhaar_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS selfie_document_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS address_proof_url TEXT;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages profiles" ON public.owner_profiles;
CREATE POLICY "Service role manages profiles" ON public.owner_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-kyc', 'owner-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
