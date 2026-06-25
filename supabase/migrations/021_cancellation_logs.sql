-- Cancellation audit log for Rydez India bookings

CREATE TABLE IF NOT EXISTS public.cancellation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  user_id UUID,
  cancelled_by TEXT NOT NULL DEFAULT 'user' CHECK (cancelled_by IN ('user', 'admin', 'owner')),
  reason_category TEXT,
  reason TEXT,
  booking_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cancellation_charges NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  policy_tier TEXT,
  refund_trip_fare_amount NUMERIC(12, 2),
  refund_deposit_amount NUMERIC(12, 2),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_logs_booking_id ON public.cancellation_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_user_id ON public.cancellation_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_created_at ON public.cancellation_logs (created_at DESC);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason_category TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_charges NUMERIC(12, 2);

ALTER TABLE public.cancellation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages cancellation_logs" ON public.cancellation_logs;
CREATE POLICY "Service role manages cancellation_logs" ON public.cancellation_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
