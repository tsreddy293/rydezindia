-- =============================================================================
-- PROMOTE A USER TO ADMIN
-- 1. Change the email below if needed
-- 2. Supabase → SQL Editor → Paste → Run
-- 3. Log in at /login/admin with that email
-- =============================================================================

DO $$
DECLARE
  target_email TEXT := 'admin@rydezindia.com';
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(target_email);

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth user found for %. Create the account first, then re-run this script.', target_email;
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  WHERE id = uid;

  IF to_regclass('public.users') IS NOT NULL THEN
    INSERT INTO public.users (id, email, name, role)
    VALUES (uid, target_email, 'Admin', 'admin')
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin',
          email = EXCLUDED.email,
          name = COALESCE(public.users.name, 'Admin');
  END IF;

  RAISE NOTICE 'Admin role granted to % (id: %)', target_email, uid;
END $$;

-- ======================== END — STOP COPYING HERE ========================
