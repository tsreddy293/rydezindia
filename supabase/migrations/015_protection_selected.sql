-- Premium Flexible Cancellation Protection selection flag

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_selected BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'flexible_cancellation'
  ) THEN
    UPDATE public.bookings
    SET protection_selected = true
    WHERE flexible_cancellation = true AND protection_selected = false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_protection_selected ON public.bookings (protection_selected);
