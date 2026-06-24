-- Booking cancellation & refund fields for Rydez India marketplace

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_status TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS trip_fare_amount NUMERIC(12, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flexible_cancellation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flexible_cancellation_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_trip_fare_amount NUMERIC(12, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_deposit_amount NUMERIC(12, 2);

-- Backfill cancellation_reason from legacy cancel_reason when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancel_reason'
  ) THEN
    UPDATE public.bookings
    SET cancellation_reason = cancel_reason
    WHERE cancellation_reason IS NULL AND cancel_reason IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_status ON public.bookings (cancellation_status);
CREATE INDEX IF NOT EXISTS idx_bookings_refund_status ON public.bookings (refund_status);
