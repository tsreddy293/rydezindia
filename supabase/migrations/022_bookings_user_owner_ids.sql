-- Link bookings to riders and owners (required for My Bookings)

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS owner_id UUID;

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings (owner_id);

-- Backfill owner_id from vehicles when possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'vehicle_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'owner_id'
  ) THEN
    UPDATE public.bookings b
    SET owner_id = v.owner_id
    FROM public.vehicles v
    WHERE b.owner_id IS NULL
      AND b.vehicle_id IS NOT NULL
      AND v.id = b.vehicle_id;
  END IF;
END $$;
