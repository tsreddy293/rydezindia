-- =============================================================================
-- FIX: "owner_profiles.kyc_status column missing" on KYC approval
-- Supabase → SQL Editor → New query → Paste ALL → Run
-- Safe to run multiple times.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'not_submitted';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Backfill owner_profiles.kyc_status from users.kyc_status
UPDATE public.owner_profiles op
SET kyc_status = CASE
  WHEN u.kyc_status IN ('verified', 'approved') THEN 'approved'
  WHEN u.kyc_status = 'rejected' THEN 'rejected'
  ELSE COALESCE(op.kyc_status, 'pending')
END
FROM public.users u
WHERE op.user_id = u.id;

NOTIFY pgrst, 'reload schema';

-- After running: retry Approve KYC in /admin/owner-management
