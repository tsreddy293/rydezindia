-- Rydez India - Sample marketplace seed data
-- Run after 004_three_module_common_fields.sql.
-- Idempotent sample data for production smoke testing.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.owners (id, owner_name, mobile, email, address, verification_status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Rydez Demo Owner',
  '9000000001',
  'demo-owner@rydezindia.com',
  'Hyderabad',
  'approved'
)
ON CONFLICT (mobile) DO NOTHING;

INSERT INTO public.vehicles (
  id,
  owner_id,
  vehicle_number,
  vehicle_name,
  vehicle_type,
  fuel_type,
  transmission,
  seats,
  status
)
VALUES
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'TS09RJ1001',
    'Toyota Innova Return Journey',
    'MUV',
    'Diesel',
    'Manual',
    7,
    'available'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'TS09DR1002',
    'Hyundai Creta Chauffeur',
    'SUV',
    'Petrol',
    'Automatic',
    5,
    'available'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'TS09SD1003',
    'Maruti Swift Self Drive',
    'Hatchback',
    'Petrol',
    'Manual',
    5,
    'available'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.return_journeys (
  id,
  owner_id,
  vehicle_id,
  vehicle_name,
  vehicle_type,
  pickup_city,
  drop_city,
  from_city,
  to_city,
  journey_date,
  journey_time,
  available_seats,
  price,
  price_per_seat,
  status
)
VALUES (
  '33333333-3333-3333-3333-333333333331',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222221',
  'Toyota Innova Return Journey',
  'MUV',
  'Vijayawada',
  'Hyderabad',
  'Vijayawada',
  'Hyderabad',
  CURRENT_DATE + INTERVAL '1 day',
  '09:00',
  4,
  900,
  900,
  'available'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.driver_vehicles (
  id,
  owner_id,
  vehicle_id,
  vehicle_name,
  vehicle_type,
  pickup_city,
  drop_city,
  journey_date,
  journey_time,
  available_seats,
  price,
  status,
  driver_name,
  driver_phone,
  rate_per_km,
  base_location,
  availability
)
VALUES (
  '33333333-3333-3333-3333-333333333332',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Hyundai Creta Chauffeur',
  'SUV',
  'Hyderabad',
  'Warangal',
  CURRENT_DATE + INTERVAL '2 days',
  '08:30',
  5,
  4500,
  'available',
  'Ramesh Kumar',
  '9000000002',
  18,
  'Hyderabad',
  'available'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.self_drive_vehicles (
  id,
  owner_id,
  vehicle_id,
  vehicle_name,
  vehicle_type,
  pickup_city,
  drop_city,
  journey_date,
  journey_time,
  available_seats,
  price,
  status,
  location,
  daily_rent,
  security_deposit,
  availability,
  photos
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222223',
  'Maruti Swift Self Drive',
  'Hatchback',
  'Hyderabad',
  '',
  CURRENT_DATE + INTERVAL '3 days',
  '10:00',
  5,
  1800,
  'available',
  'Hyderabad',
  1800,
  5000,
  'available',
  '{}'
)
ON CONFLICT (id) DO NOTHING;
