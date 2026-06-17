-- =============================================================================
-- RYDEZ INDIA — CREATE public.vehicles TABLE
-- Copy from line 1 through the END marker below. Do NOT paste other filenames.
-- Supabase → SQL Editor → New query → Paste → Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL CHECK (vehicle_year >= 1990),
  vehicle_category TEXT NOT NULL,
  vehicle_photo_url TEXT,
  rc_document_url TEXT,
  insurance_document_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles (owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_approval_status ON public.vehicles (approval_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_registration_number ON public.vehicles (registration_number);

CREATE OR REPLACE FUNCTION public.vehicles_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vehicles_set_updated_at ON public.vehicles;
CREATE TRIGGER vehicles_set_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.vehicles_set_updated_at();

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners select own vehicles" ON public.vehicles;
CREATE POLICY "Owners select own vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners insert own vehicles" ON public.vehicles;
CREATE POLICY "Owners insert own vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners update own vehicles" ON public.vehicles;
CREATE POLICY "Owners update own vehicles"
  ON public.vehicles FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners delete own vehicles" ON public.vehicles;
CREATE POLICY "Owners delete own vehicles"
  ON public.vehicles FOR DELETE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Admins manage all vehicles" ON public.vehicles;
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    CREATE POLICY "Admins manage all vehicles"
      ON public.vehicles FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;

-- Optional: storage bucket for photo/document uploads (safe to skip if this section errors)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('vehicle-assets', 'vehicle-assets', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage bucket setup skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Owners upload vehicle assets" ON storage.objects;
  CREATE POLICY "Owners upload vehicle assets"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'vehicle-assets'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  DROP POLICY IF EXISTS "Public read vehicle assets" ON storage.objects;
  CREATE POLICY "Public read vehicle assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'vehicle-assets');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Storage policies skipped: %', SQLERRM;
END $$;

-- ======================== END — STOP COPYING HERE ========================
