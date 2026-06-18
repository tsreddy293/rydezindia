-- Owner approval status on users table (pending | approved | rejected)

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
  END IF;
END $$;
