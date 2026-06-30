-- Self-drive payment workflow columns — run in Supabase SQL Editor
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_refund_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS deposit_refund_status TEXT;
