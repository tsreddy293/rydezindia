-- Protection & flexible cancellation columns on bookings (idempotent)

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flexible_cancellation BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS flexible_cancellation_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_selected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_plan_name VARCHAR(100);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_purchase_date TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS protection_status TEXT;

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

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'flexible_cancellation_fee'
  ) THEN
    UPDATE public.bookings
    SET protection_fee = flexible_cancellation_fee
    WHERE (protection_fee IS NULL OR protection_fee = 0)
      AND flexible_cancellation_fee > 0;
  END IF;

  UPDATE public.bookings
  SET protection_status = 'active'
  WHERE protection_selected = true AND protection_status IS NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_protection_selected ON public.bookings (protection_selected);
CREATE INDEX IF NOT EXISTS idx_bookings_protection_status ON public.bookings (protection_status);
