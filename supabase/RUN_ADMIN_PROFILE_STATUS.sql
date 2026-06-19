-- Admin merged management — owner_profiles + customer_profiles status columns
-- For owner KYC fix, prefer: supabase/RUN_FIX_KYC_APPROVAL.sql

DO $$
BEGIN
  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.customer_profiles') IS NOT NULL THEN
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  END IF;
END $$;

UPDATE public.owner_profiles op
SET kyc_status = CASE
  WHEN u.kyc_status IN ('verified', 'approved') THEN 'approved'
  WHEN u.kyc_status = 'rejected' THEN 'rejected'
  ELSE COALESCE(op.kyc_status, 'pending')
END
FROM public.users u
WHERE op.user_id = u.id AND u.role = 'owner';

UPDATE public.owner_profiles op
SET owner_status = CASE
  WHEN u.owner_status IN ('approved', 'verified') THEN 'approved'
  WHEN u.owner_status = 'rejected' THEN 'rejected'
  ELSE COALESCE(op.owner_status, 'pending')
END
FROM public.users u
WHERE op.user_id = u.id AND u.role = 'owner';

NOTIFY pgrst, 'reload schema';
