-- Add 'rider' to user_role enum (fixes: invalid input value for enum user_role: "rider")
-- Supabase → SQL Editor → Run once

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'rider'
    ) THEN
      ALTER TYPE public.user_role ADD VALUE 'rider';
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.users SET role = 'rider' WHERE role::text = 'user';

NOTIFY pgrst, 'reload schema';
