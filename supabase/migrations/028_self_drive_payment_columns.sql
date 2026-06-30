-- Self-drive payment workflow columns (idempotent)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS deposit_refund_status TEXT;

COMMENT ON COLUMN public.bookings.advance_amount IS 'Self-drive: 30% trip fare collected at booking';
COMMENT ON COLUMN public.bookings.balance_amount IS 'Self-drive: remaining 70% trip fare due before pickup';
COMMENT ON COLUMN public.bookings.amount_paid IS 'Total amount paid online across all payment stages';
COMMENT ON COLUMN public.bookings.amount_due IS 'Outstanding balance (typically 70% trip fare)';
COMMENT ON COLUMN public.bookings.deposit_refund_amount IS 'Security deposit refunded after inspection';
COMMENT ON COLUMN public.bookings.deposit_refund_status IS 'none|pending|processing|refunded|partial';
