-- Rydez India — Phase 1 modules
-- Vehicle images/documents, profiles, earnings, route matching, booking references, saved vehicles
-- Safe to run after 006.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Extend vehicles table ───────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.vehicles') IS NOT NULL THEN
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS has_ac BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 4.50;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- ─── Vehicle images ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON public.vehicle_images (vehicle_id, sort_order);

-- ─── Vehicle documents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (
    document_type IN ('rc', 'insurance', 'pollution', 'fitness')
  ),
  document_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents (vehicle_id);

-- ─── Owner & customer profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  pan_number TEXT,
  gst_number TEXT,
  bank_account TEXT,
  ifsc_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_profiles_user_id ON public.owner_profiles (user_id);

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  preferred_vehicle_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles (user_id);

-- ─── Saved vehicles (customer favourites) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  listing_type TEXT NOT NULL DEFAULT 'with_driver',
  listing_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vehicle_id, listing_type)
);

CREATE INDEX IF NOT EXISTS idx_saved_vehicles_user_id ON public.saved_vehicles (user_id);

-- ─── Owner earnings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.owner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  booking_id UUID,
  payment_id UUID,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'cancelled')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_earnings_owner_id ON public.owner_earnings (owner_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_earnings_booking_id ON public.owner_earnings (booking_id);

-- ─── Route matches (smart matching cache) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.route_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_journey_id UUID NOT NULL,
  search_from_city TEXT NOT NULL,
  search_to_city TEXT NOT NULL,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_matches_journey ON public.route_matches (return_journey_id);
CREATE INDEX IF NOT EXISTS idx_route_matches_cities ON public.route_matches (search_from_city, search_to_city);

-- ─── Extend return_journeys for return-deal fields ───────────────────────────
DO $$
BEGIN
  IF to_regclass('public.return_journeys') IS NOT NULL THEN
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS return_from_city TEXT;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS return_to_city TEXT;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS return_departure_time TEXT;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 30;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS driver_name TEXT;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS driver_phone TEXT;
  END IF;
END $$;

-- ─── Extend bookings ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_reference TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS drop_location TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_date DATE;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_time TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_type TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_required BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_instructions TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full';
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_fare NUMERIC(12,2);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_booking_reference ON public.bookings (booking_reference)
  WHERE booking_reference IS NOT NULL;

-- ─── Booking reference sequence (RYD202600001) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_reference_sequence (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.next_booking_reference(p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  INSERT INTO public.booking_reference_sequence (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET last_number = booking_reference_sequence.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN 'RYD' || p_year::TEXT || LPAD(next_num::TEXT, 5, '0');
END;
$$;

-- ─── Extend payments ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'full';
  END IF;
END $$;

-- ─── Storage bucket for vehicle assets ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-assets', 'vehicle-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role manages vehicle assets" ON storage.objects;
CREATE POLICY "Service role manages vehicle assets" ON storage.objects
  FOR ALL USING (bucket_id = 'vehicle-assets' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'vehicle-assets' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read vehicle assets" ON storage.objects;
CREATE POLICY "Public read vehicle assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'vehicle-assets');

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read vehicle images" ON public.vehicle_images;
CREATE POLICY "Public read vehicle images" ON public.vehicle_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages vehicle images" ON public.vehicle_images;
CREATE POLICY "Service role manages vehicle images" ON public.vehicle_images
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages vehicle documents" ON public.vehicle_documents;
CREATE POLICY "Service role manages vehicle documents" ON public.vehicle_documents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Owners read own documents" ON public.vehicle_documents;
CREATE POLICY "Owners read own documents" ON public.vehicle_documents
  FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users manage own saved vehicles" ON public.saved_vehicles;
CREATE POLICY "Users manage own saved vehicles" ON public.saved_vehicles
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role')
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages profiles" ON public.owner_profiles;
CREATE POLICY "Service role manages profiles" ON public.owner_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages customer profiles" ON public.customer_profiles;
CREATE POLICY "Service role manages customer profiles" ON public.customer_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages earnings" ON public.owner_earnings;
CREATE POLICY "Service role manages earnings" ON public.owner_earnings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read route matches" ON public.route_matches;
CREATE POLICY "Public read route matches" ON public.route_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages route matches" ON public.route_matches;
CREATE POLICY "Service role manages route matches" ON public.route_matches
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
