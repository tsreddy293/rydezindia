-- Rydez India - Marketplace core bootstrap
-- Ready for Supabase SQL Editor.
--
-- Use this when production currently has only:
--   public.return_journeys
--   public.bookings
--   public.users
--
-- This script is additive only. It does not drop or rewrite existing
-- return journey or booking data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE public.listing_status AS ENUM ('available', 'unavailable', 'booked', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type') THEN
    CREATE TYPE public.booking_type AS ENUM ('return_journey', 'self_drive', 'with_driver');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  address TEXT,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_mobile_unique ON public.owners (mobile);
CREATE INDEX IF NOT EXISTS idx_owners_verification_status ON public.owners (verification_status);
CREATE INDEX IF NOT EXISTS idx_owners_created_at ON public.owners (created_at);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  vehicle_number TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (
    vehicle_type IN (
      'Hatchback',
      'Sedan',
      'SUV',
      'MUV',
      'Luxury',
      'Tempo Traveller',
      'Mini Bus',
      'Bus'
    )
  ),
  fuel_type TEXT,
  transmission TEXT,
  seats INTEGER NOT NULL CHECK (seats > 0),
  photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles (owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON public.vehicles (vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON public.vehicles (created_at);

CREATE TABLE IF NOT EXISTS public.self_drive_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  daily_rent NUMERIC(10, 2) NOT NULL CHECK (daily_rent >= 0),
  security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  availability public.listing_status NOT NULL DEFAULT 'available',
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_self_drive_owner_id ON public.self_drive_vehicles (owner_id);
CREATE INDEX IF NOT EXISTS idx_self_drive_vehicle_id ON public.self_drive_vehicles (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_self_drive_location ON public.self_drive_vehicles (location);
CREATE INDEX IF NOT EXISTS idx_self_drive_availability ON public.self_drive_vehicles (availability);
CREATE INDEX IF NOT EXISTS idx_self_drive_created_at ON public.self_drive_vehicles (created_at);

-- Non-destructive booking compatibility for the new marketplace modules.
-- Existing return journey booking columns/data remain untouched.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type public.booking_type;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS passenger_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'ride_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.bookings
      SET booking_type = COALESCE(booking_type, 'return_journey'::public.booking_type),
          reference_id = COALESCE(reference_id, ride_id)
      WHERE booking_type IS NULL OR reference_id IS NULL
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings (booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_id ON public.bookings (reference_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_drive_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read owners" ON public.owners;
CREATE POLICY "Public read owners" ON public.owners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert owners" ON public.owners;
CREATE POLICY "Public insert owners" ON public.owners FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert vehicles" ON public.vehicles;
CREATE POLICY "Public insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public read self drive vehicles"
  ON public.self_drive_vehicles
  FOR SELECT
  USING (availability = 'available');

DROP POLICY IF EXISTS "Public insert self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public insert self drive vehicles"
  ON public.self_drive_vehicles
  FOR INSERT
  WITH CHECK (true);
