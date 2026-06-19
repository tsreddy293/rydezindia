-- Admin merged management — owner_profiles status columns
-- Prefer: supabase/RUN_FIX_KYC_APPROVAL.sql

DO $$
BEGIN
  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.customer_profiles') IS NOT NULL THEN
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
