-- =============================================================================
-- RYDEZ INDIA — Rider signup: rider_profiles + safe auth.users trigger
-- Supabase → SQL Editor → New query → Paste → Run
-- Safe to run multiple times.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Align rider_profiles with auth user (id = auth.users.id)
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  city TEXT,
  mobile TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.rider_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill user_id from id when legacy rows only have id
UPDATE public.rider_profiles SET user_id = id WHERE user_id IS NULL AND id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rider_profiles_user_id ON public.rider_profiles (user_id);

-- Ensure public.users accepts rider role (drop legacy check if present)
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
  END IF;
END $$;

ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rider profiles" ON public.rider_profiles;
CREATE POLICY "Service role manages rider profiles" ON public.rider_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Riders read own profile" ON public.rider_profiles;
CREATE POLICY "Riders read own profile" ON public.rider_profiles
  FOR SELECT USING (user_id = auth.uid() OR id = auth.uid() OR auth.role() = 'service_role');

-- Replace brittle signup triggers with a minimal, role-safe handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_role TEXT := COALESCE(meta->>'role', 'rider');
  user_name TEXT := COALESCE(NULLIF(trim(meta->>'name'), ''), split_part(NEW.email, '@', 1));
  user_city TEXT := NULLIF(trim(meta->>'city'), '');
  user_mobile TEXT := NULLIF(trim(meta->>'mobile'), '');
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, mobile, city, role)
    VALUES (NEW.id, NEW.email, user_name, user_mobile, user_city, user_role)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      mobile = COALESCE(EXCLUDED.mobile, public.users.mobile),
      city = COALESCE(EXCLUDED.city, public.users.city),
      role = COALESCE(EXCLUDED.role, public.users.role);
  END IF;

  IF user_role IN ('rider', 'user') AND to_regclass('public.rider_profiles') IS NOT NULL THEN
    INSERT INTO public.rider_profiles (id, user_id, full_name, email, city, mobile)
    VALUES (NEW.id, NEW.id, user_name, NEW.email, user_city, user_mobile)
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = COALESCE(EXCLUDED.full_name, public.rider_profiles.full_name),
      email = COALESCE(EXCLUDED.email, public.rider_profiles.email),
      city = COALESCE(EXCLUDED.city, public.rider_profiles.city),
      mobile = COALESCE(EXCLUDED.mobile, public.rider_profiles.mobile),
      updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';

-- ======================== END — STOP COPYING HERE ========================
