-- Vehicle owner onboarding: draft status, pricing, re-upload flags
DO $$
BEGIN
  IF to_regclass('public.vehicles') IS NOT NULL THEN
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rate_per_km NUMERIC(10, 2);
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS base_location TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS reupload_requested BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS reupload_reason TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.vehicles.vehicle_approval_status IS 'draft | pending | approved | rejected';
