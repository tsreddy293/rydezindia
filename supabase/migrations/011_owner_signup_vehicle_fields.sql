-- Decouple owner signup from vehicle details; add vehicle make/model/year

DO $$
BEGIN
  IF to_regclass('public.vehicle_owners') IS NOT NULL THEN
    ALTER TABLE public.vehicle_owners ALTER COLUMN vehicle_type DROP NOT NULL;
    ALTER TABLE public.vehicle_owners ALTER COLUMN vehicle_number DROP NOT NULL;
  END IF;

  IF to_regclass('public.vehicles') IS NOT NULL THEN
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
  END IF;

  IF to_regclass('public.owner_profiles') IS NOT NULL THEN
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
    ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
  END IF;
END $$;
