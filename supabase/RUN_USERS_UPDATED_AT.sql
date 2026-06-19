-- =============================================================================
-- OPTIONAL — add updated_at to public.users (only if you want timestamp tracking)
-- The app works without this column; users table writes omit updated_at.
-- Supabase → SQL Editor → Run once if desired.
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
