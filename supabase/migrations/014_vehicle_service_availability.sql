-- Vehicle service availability flags (Self Drive, With Driver, Local Rental, Return Journey)

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS service_self_drive BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS service_with_driver BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS service_local_rental BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS service_return_journey BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_service_self_drive ON public.vehicles (service_self_drive);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_with_driver ON public.vehicles (service_with_driver);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_local_rental ON public.vehicles (service_local_rental);
CREATE INDEX IF NOT EXISTS idx_vehicles_service_return_journey ON public.vehicles (service_return_journey);

-- Existing approved vehicles: enable core services, return journey stays optional (false)
UPDATE public.vehicles
SET
  service_self_drive = COALESCE(service_self_drive, true),
  service_with_driver = COALESCE(service_with_driver, true),
  service_local_rental = COALESCE(service_local_rental, true),
  service_return_journey = COALESCE(service_return_journey, false)
WHERE approval_status = 'approved';
