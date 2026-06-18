-- =============================================================================
-- RYDEZ INDIA — Add owner_status to public.users
-- Supabase → SQL Editor → New query → Paste → Run
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';

    ALTER TABLE public.users
      DROP CONSTRAINT IF EXISTS users_owner_status_check;

    ALTER TABLE public.users
      ADD CONSTRAINT users_owner_status_check
      CHECK (owner_status IN ('pending', 'approved', 'rejected'));

    CREATE INDEX IF NOT EXISTS idx_users_owner_status ON public.users (owner_status);

    -- Backfill from legacy kyc_status where owner_status is still default pending
    UPDATE public.users
    SET owner_status = CASE
      WHEN kyc_status = 'verified' THEN 'approved'
      WHEN kyc_status = 'rejected' THEN 'rejected'
      WHEN kyc_status = 'pending' THEN 'pending'
      ELSE owner_status
    END
    WHERE role = 'owner'
      AND owner_status = 'pending'
      AND kyc_status IN ('verified', 'rejected', 'pending');
  END IF;
END $$;

-- ======================== END — STOP COPYING HERE ========================
