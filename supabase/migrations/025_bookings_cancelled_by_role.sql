-- Separate actor role from actor user id on bookings cancellations.
-- cancelled_by should store the authenticated user's UUID (not role labels like 'rider').

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT;

COMMENT ON COLUMN public.bookings.cancelled_by IS 'UUID of the user who cancelled the booking';
COMMENT ON COLUMN public.bookings.cancelled_by_role IS 'Actor role at cancellation time: rider, owner, or admin';

NOTIFY pgrst, 'reload schema';
