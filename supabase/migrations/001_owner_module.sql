-- Rydez India — Schema updates for owner registration module
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Extend vehicle_owners with owner profile fields
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
ALTER TABLE public.vehicle_owners ADD COLUMN IF NOT EXISTS license_number TEXT;

-- 2. Create vehicles table (for vehicle registration page)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.vehicle_owners(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  seats INTEGER NOT NULL CHECK (seats > 0),
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON public.vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_from_city ON public.vehicles(from_city);
CREATE INDEX IF NOT EXISTS idx_vehicles_to_city ON public.vehicles(to_city);

-- 3. Enable RLS with public read (service role bypasses anyway)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
CREATE POLICY "Public read vehicles" ON public.vehicles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert vehicles" ON public.vehicles;
CREATE POLICY "Public insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read vehicle_owners" ON public.vehicle_owners;
CREATE POLICY "Public read vehicle_owners" ON public.vehicle_owners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert vehicle_owners" ON public.vehicle_owners;
CREATE POLICY "Public insert vehicle_owners" ON public.vehicle_owners FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read return_journeys" ON public.return_journeys;
CREATE POLICY "Public read return_journeys" ON public.return_journeys FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read bookings" ON public.bookings;
CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read users" ON public.users;
CREATE POLICY "Public read users" ON public.users FOR SELECT USING (true);
