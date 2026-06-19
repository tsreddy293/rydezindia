-- =============================================================================
-- owner_profiles approval columns (kyc_status, owner_status, approved_at, approved_by)
-- Supabase → SQL Editor → Run
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
