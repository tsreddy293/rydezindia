-- Run in Supabase SQL Editor: vehicle trip type columns

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trip_one_way BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trip_round_trip BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trip_multi_city BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trip_airport_transfer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trip_local_rental BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_vehicles_trip_one_way ON public.vehicles (trip_one_way);
CREATE INDEX IF NOT EXISTS idx_vehicles_trip_round_trip ON public.vehicles (trip_round_trip);
CREATE INDEX IF NOT EXISTS idx_vehicles_trip_multi_city ON public.vehicles (trip_multi_city);
CREATE INDEX IF NOT EXISTS idx_vehicles_trip_airport_transfer ON public.vehicles (trip_airport_transfer);
CREATE INDEX IF NOT EXISTS idx_vehicles_trip_local_rental ON public.vehicles (trip_local_rental);

UPDATE public.vehicles
SET
  trip_one_way = COALESCE(trip_one_way, true),
  trip_round_trip = COALESCE(trip_round_trip, true),
  trip_multi_city = COALESCE(trip_multi_city, false),
  trip_airport_transfer = COALESCE(trip_airport_transfer, false),
  trip_local_rental = COALESCE(trip_local_rental, true)
WHERE approval_status = 'approved';
