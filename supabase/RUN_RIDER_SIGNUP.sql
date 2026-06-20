-- =============================================================================
-- RYDEZ INDIA — Fix rider signup ("Database error saving new user")
-- Supabase → SQL Editor → New query → Paste ALL → Run once
-- Safe to run multiple times.
--
-- Root cause: a trigger on auth.users fails when inserting rider rows
-- (rider_profiles schema mismatch, role constraint, duplicate email, etc.)
-- The app now creates profiles via service role — triggers are not needed.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Remove ALL custom triggers on auth.users (fixes signup immediately) ───
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.trigger_name);
    RAISE NOTICE 'Dropped trigger % on auth.users', r.trigger_name;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ─── 2. public.users must accept role = rider ───────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  END IF;
END $$;

-- Add 'rider' to user_role enum (legacy DBs only had user | owner | admin)
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
  WHEN duplicate_object THEN
    NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'user_role enum update skipped: %', SQLERRM;
END $$;

-- Normalize legacy rows: user → rider (after enum value exists)
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    BEGIN
      UPDATE public.users SET role = 'rider' WHERE role::text = 'user';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'user→rider migration skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- ─── 3. rider_profiles aligned with auth.users.id ───────────────────────────
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,
  full_name TEXT,
  email TEXT,
  city TEXT,
  mobile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add FK only when safe (ignore if legacy data prevents it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rider_profiles_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.rider_profiles
        ADD CONSTRAINT rider_profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped rider_profiles_id_fkey: %', SQLERRM;
    END;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rider_profiles_user_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.rider_profiles
        ADD CONSTRAINT rider_profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped rider_profiles_user_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

UPDATE public.rider_profiles SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rider_profiles_user_id ON public.rider_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_rider_profiles_email ON public.rider_profiles (lower(email));

-- ─── 4. RLS — service role writes profiles from server actions ──────────────
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rider profiles" ON public.rider_profiles;
CREATE POLICY "Service role manages rider profiles" ON public.rider_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Riders read own profile" ON public.rider_profiles;
CREATE POLICY "Riders read own profile" ON public.rider_profiles
  FOR SELECT USING (user_id = auth.uid() OR id = auth.uid() OR auth.role() = 'service_role');

-- Allow service role full access to public.users (if RLS enabled)
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Service role manages users" ON public.users;
    CREATE POLICY "Service role manages users" ON public.users
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ======================== END — STOP COPYING HERE ========================
