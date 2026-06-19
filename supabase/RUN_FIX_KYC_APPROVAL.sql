-- =============================================================================
-- REQUIRED: Owner KYC + Owner approval columns on owner_profiles
-- Error fixed: "owner_profiles.kyc_status column missing"
--
-- Supabase → SQL Editor → New query → Paste ALL → Run
-- Safe to run multiple times.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

    -- Legacy column: public.owner_profiles.status → owner_status
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'owner_profiles'
        AND column_name = 'status'
    ) THEN
      UPDATE public.owner_profiles
      SET owner_status = CASE
        WHEN status IN ('approved', 'verified') THEN 'approved'
        WHEN status = 'rejected' THEN 'rejected'
        ELSE COALESCE(owner_status, 'pending')
      END
      WHERE owner_status IS NULL OR owner_status = 'pending';
    END IF;
  END IF;

  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'not_submitted';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Sync owner_profiles from users (existing approved owners)
UPDATE public.owner_profiles op
SET
  kyc_status = CASE
    WHEN u.kyc_status IN ('verified', 'approved') THEN 'approved'
    WHEN u.kyc_status = 'rejected' THEN 'rejected'
    ELSE COALESCE(op.kyc_status, 'pending')
  END,
  owner_status = CASE
    WHEN u.owner_status IN ('approved', 'verified') THEN 'approved'
    WHEN u.owner_status = 'rejected' THEN 'rejected'
    ELSE COALESCE(op.owner_status, 'pending')
  END,
  kyc_approved_at = CASE
    WHEN u.kyc_status IN ('verified', 'approved') AND op.kyc_approved_at IS NULL THEN now()
    ELSE op.kyc_approved_at
  END,
  owner_approved_at = CASE
    WHEN u.owner_status IN ('approved', 'verified') AND op.owner_approved_at IS NULL THEN now()
    ELSE op.owner_approved_at
  END
FROM public.users u
WHERE op.user_id = u.id;

NOTIFY pgrst, 'reload schema';

-- After running: Approve KYC → owner_profiles.kyc_status = 'approved'
-- Then Approve Owner → owner_profiles.owner_status = 'approved'
