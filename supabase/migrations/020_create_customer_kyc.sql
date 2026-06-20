-- Migration 020 — create customer_kyc (mirrors supabase/RUN_CREATE_CUSTOMER_KYC.sql)

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

ALTER TABLE public.customer_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages customer kyc" ON public.customer_kyc;
CREATE POLICY "Service role manages customer kyc" ON public.customer_kyc
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own customer kyc" ON public.customer_kyc;
CREATE POLICY "Users read own customer kyc" ON public.customer_kyc
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
