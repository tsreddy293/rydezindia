-- Booking activity audit trail for Rydez India

CREATE TABLE IF NOT EXISTS public.booking_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID,
  actor_role TEXT,
  reason TEXT,
  ip_address TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_activity_logs_booking_id
  ON public.booking_activity_logs (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_activity_logs_created_at
  ON public.booking_activity_logs (created_at DESC);

ALTER TABLE public.booking_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages booking_activity_logs" ON public.booking_activity_logs;
CREATE POLICY "Service role manages booking_activity_logs" ON public.booking_activity_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

NOTIFY pgrst, 'reload schema';
