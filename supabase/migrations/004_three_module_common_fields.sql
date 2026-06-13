-- Rydez India - Three independent marketplace modules with common fields
-- Ready for Supabase SQL Editor.
--
-- Modules:
--   public.return_journeys
--   public.driver_vehicles
--   public.self_drive_vehicles
--
-- This script is additive. It preserves existing return_journeys/bookings data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE public.listing_status AS ENUM ('available', 'unavailable', 'booked', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type') THEN
    CREATE TYPE public.booking_type AS ENUM ('return_journey', 'self_drive', 'with_driver');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  vehicle_name TEXT NOT NULL DEFAULT 'Vehicle',
  vehicle_type TEXT NOT NULL DEFAULT 'SUV',
  pickup_city TEXT NOT NULL DEFAULT '',
  drop_city TEXT NOT NULL DEFAULT '',
  journey_date DATE,
  journey_time TIME,
  available_seats INTEGER NOT NULL DEFAULT 1 CHECK (available_seats >= 0),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'available',
  driver_name TEXT,
  driver_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.self_drive_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  vehicle_name TEXT NOT NULL DEFAULT 'Vehicle',
  vehicle_type TEXT NOT NULL DEFAULT 'SUV',
  pickup_city TEXT NOT NULL DEFAULT '',
  drop_city TEXT NOT NULL DEFAULT '',
  journey_date DATE,
  journey_time TIME,
  available_seats INTEGER NOT NULL DEFAULT 1 CHECK (available_seats >= 0),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'available',
  location TEXT,
  daily_rent NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (daily_rent >= 0),
  security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS vehicle_name TEXT;
ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS pickup_city TEXT;
ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS drop_city TEXT;
ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS journey_time TIME;
ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

UPDATE public.return_journeys
SET pickup_city = COALESCE(pickup_city, from_city),
    drop_city = COALESCE(drop_city, to_city),
    price = COALESCE(price, price_per_seat)
WHERE pickup_city IS NULL OR drop_city IS NULL OR price IS NULL;

ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS vehicle_name TEXT NOT NULL DEFAULT 'Vehicle';
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'SUV';
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS pickup_city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS drop_city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS journey_date DATE;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS journey_time TIME;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS available_seats INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS base_location TEXT;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS rate_per_km NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS availability public.listing_status NOT NULL DEFAULT 'available';

UPDATE public.driver_vehicles
SET pickup_city = COALESCE(NULLIF(pickup_city, ''), base_location, ''),
    price = CASE WHEN price > 0 THEN price ELSE COALESCE(rate_per_km, 0) END,
    status = COALESCE(NULLIF(status, ''), availability::TEXT, 'available')
WHERE pickup_city = '' OR price = 0 OR status IS NULL;

ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS vehicle_name TEXT NOT NULL DEFAULT 'Vehicle';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'SUV';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS pickup_city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS drop_city TEXT NOT NULL DEFAULT '';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS journey_date DATE;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS journey_time TIME;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS available_seats INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS daily_rent NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS availability public.listing_status NOT NULL DEFAULT 'available';
ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.self_drive_vehicles
SET pickup_city = COALESCE(NULLIF(pickup_city, ''), location, ''),
    price = CASE WHEN price > 0 THEN price ELSE COALESCE(daily_rent, 0) END,
    status = COALESCE(NULLIF(status, ''), availability::TEXT, 'available')
WHERE pickup_city = '' OR price = 0 OR status IS NULL;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type public.booking_type;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
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

CREATE INDEX IF NOT EXISTS idx_return_journeys_pickup_city ON public.return_journeys (pickup_city);
CREATE INDEX IF NOT EXISTS idx_return_journeys_drop_city ON public.return_journeys (drop_city);
CREATE INDEX IF NOT EXISTS idx_return_journeys_journey_date ON public.return_journeys (journey_date);
CREATE INDEX IF NOT EXISTS idx_return_journeys_status ON public.return_journeys (status);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_pickup_city ON public.driver_vehicles (pickup_city);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_drop_city ON public.driver_vehicles (drop_city);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_journey_date ON public.driver_vehicles (journey_date);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_status ON public.driver_vehicles (status);

CREATE INDEX IF NOT EXISTS idx_self_drive_vehicles_pickup_city ON public.self_drive_vehicles (pickup_city);
CREATE INDEX IF NOT EXISTS idx_self_drive_vehicles_journey_date ON public.self_drive_vehicles (journey_date);
CREATE INDEX IF NOT EXISTS idx_self_drive_vehicles_status ON public.self_drive_vehicles (status);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings (booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_id ON public.bookings (reference_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings (vehicle_id);

ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_drive_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read driver vehicles" ON public.driver_vehicles;
CREATE POLICY "Public read driver vehicles"
  ON public.driver_vehicles FOR SELECT
  USING (status = 'available' OR availability = 'available');

DROP POLICY IF EXISTS "Public insert driver vehicles" ON public.driver_vehicles;
CREATE POLICY "Public insert driver vehicles"
  ON public.driver_vehicles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public read self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public read self drive vehicles"
  ON public.self_drive_vehicles FOR SELECT
  USING (status = 'available' OR availability = 'available');

DROP POLICY IF EXISTS "Public insert self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public insert self drive vehicles"
  ON public.self_drive_vehicles FOR INSERT
  WITH CHECK (true);
