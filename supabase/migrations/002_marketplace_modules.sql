-- Rydez India - Complete vehicle marketplace modules
-- Safe to run after 001_owner_module.sql. This migration avoids dropping live data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_type') THEN
    CREATE TYPE public.booking_type AS ENUM ('return_journey', 'self_drive', 'with_driver');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE public.listing_status AS ENUM ('available', 'unavailable', 'booked', 'completed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');
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

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;

UPDATE public.users
SET full_name = COALESCE(full_name, name)
WHERE full_name IS NULL AND EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'name'
);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_name TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS transmission TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'from_city'
  ) THEN
    ALTER TABLE public.vehicles ALTER COLUMN from_city DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'to_city'
  ) THEN
    ALTER TABLE public.vehicles ALTER COLUMN to_city DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'price'
  ) THEN
    ALTER TABLE public.vehicles ALTER COLUMN price DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehicles_vehicle_type_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_vehicle_type_check
      CHECK (
        vehicle_type IS NULL OR vehicle_type IN (
          'Hatchback',
          'Sedan',
          'SUV',
          'MUV',
          'Luxury',
          'Tempo Traveller',
          'Mini Bus',
          'Bus'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vehicles_seats_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_seats_check
      CHECK (seats IS NULL OR seats > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles (owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON public.vehicles (vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);

INSERT INTO public.owners (owner_name, mobile, email, address, verification_status, created_at)
SELECT
  COALESCE(vo.name, u.name, 'Owner') AS owner_name,
  COALESCE(NULLIF(vo.mobile, ''), NULLIF(u.mobile, ''), vo.id::TEXT) AS mobile,
  COALESCE(NULLIF(vo.email, ''), NULLIF(u.email, '')) AS email,
  COALESCE(NULLIF(vo.city, ''), NULLIF(u.city, '')) AS address,
  CASE
    WHEN vo.status = 'approved' THEN 'approved'::public.verification_status
    WHEN vo.status = 'rejected' THEN 'rejected'::public.verification_status
    ELSE 'pending'::public.verification_status
  END AS verification_status,
  COALESCE(vo.created_at, NOW()) AS created_at
FROM public.vehicle_owners vo
LEFT JOIN public.users u ON u.id = vo.owner_id
ON CONFLICT (mobile) DO NOTHING;

INSERT INTO public.vehicles (
  owner_id,
  vehicle_number,
  vehicle_name,
  vehicle_type,
  seats,
  status,
  created_at
)
SELECT
  vo.id,
  vo.vehicle_number,
  COALESCE(NULLIF(vo.vehicle_model, ''), vo.vehicle_number, 'Vehicle'),
  vo.vehicle_type,
  NULLIF(vo.seating_capacity, 0),
  COALESCE(vo.status, 'pending'),
  COALESCE(vo.created_at, NOW())
FROM public.vehicle_owners vo
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vehicles v
  WHERE v.vehicle_number = vo.vehicle_number
);

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

CREATE INDEX IF NOT EXISTS idx_self_drive_location ON public.self_drive_vehicles (location);
CREATE INDEX IF NOT EXISTS idx_self_drive_availability ON public.self_drive_vehicles (availability);
CREATE INDEX IF NOT EXISTS idx_self_drive_vehicle_id ON public.self_drive_vehicles (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_self_drive_owner_id ON public.self_drive_vehicles (owner_id);

CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_name TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  rate_per_km NUMERIC(10, 2) NOT NULL CHECK (rate_per_km >= 0),
  base_location TEXT NOT NULL,
  availability public.listing_status NOT NULL DEFAULT 'available',
  local_package_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  outstation_package_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  airport_transfer_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_base_location ON public.driver_vehicles (base_location);
CREATE INDEX IF NOT EXISTS idx_driver_availability ON public.driver_vehicles (availability);
CREATE INDEX IF NOT EXISTS idx_driver_vehicle_id ON public.driver_vehicles (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_owner_id ON public.driver_vehicles (owner_id);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type public.booking_type;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.bookings
SET booking_type = 'return_journey',
    reference_id = COALESCE(reference_id, ride_id)
WHERE booking_type IS NULL
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'ride_id'
  );

CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON public.bookings (booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_reference_id ON public.bookings (reference_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_mode TEXT NOT NULL DEFAULT 'online',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments (payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_drive_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read owners" ON public.owners;
CREATE POLICY "Public read owners" ON public.owners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert owners" ON public.owners;
CREATE POLICY "Public insert owners" ON public.owners FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert vehicles" ON public.vehicles;
CREATE POLICY "Public insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public read self drive vehicles" ON public.self_drive_vehicles FOR SELECT USING (availability = 'available');

DROP POLICY IF EXISTS "Public insert self drive vehicles" ON public.self_drive_vehicles;
CREATE POLICY "Public insert self drive vehicles" ON public.self_drive_vehicles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read driver vehicles" ON public.driver_vehicles;
CREATE POLICY "Public read driver vehicles" ON public.driver_vehicles FOR SELECT USING (availability = 'available');

DROP POLICY IF EXISTS "Public insert driver vehicles" ON public.driver_vehicles;
CREATE POLICY "Public insert driver vehicles" ON public.driver_vehicles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read payments" ON public.payments;
CREATE POLICY "Public read payments" ON public.payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert payments" ON public.payments;
CREATE POLICY "Public insert payments" ON public.payments FOR INSERT WITH CHECK (true);
