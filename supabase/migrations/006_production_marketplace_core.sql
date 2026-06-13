-- Rydez India - Production marketplace core
-- Adds OTP, KYC, approvals, cancellations, notifications, payments, refunds, and storage policies.
-- Safe to run after 003/004. Most column additions are guarded for partially migrated databases.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile TEXT;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF to_regclass('public.owners') IS NOT NULL THEN
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS mobile TEXT;
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
  END IF;

  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.vehicles') IS NOT NULL THEN
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS vehicle_approval_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.return_journeys') IS NOT NULL THEN
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS vehicle_approval_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE public.return_journeys ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.driver_vehicles') IS NOT NULL THEN
    ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS vehicle_approval_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
  END IF;

  IF to_regclass('public.self_drive_vehicles') IS NOT NULL THEN
    ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS vehicle_approval_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
    ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS approved_by UUID;
    ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    ALTER TABLE public.self_drive_vehicles ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'signup',
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_mobile_purpose ON public.auth_otps (mobile, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires_at ON public.auth_otps (expires_at);

CREATE TABLE IF NOT EXISTS public.owner_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  aadhaar_url TEXT,
  pan_url TEXT,
  license_url TEXT,
  rc_url TEXT,
  insurance_url TEXT,
  vehicle_photos TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_kyc_owner_id ON public.owner_kyc (owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_kyc_status ON public.owner_kyc (status);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID,
  recipient_role TEXT,
  actor_id UUID,
  actor_role TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, recipient_role, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  user_id UUID,
  owner_id UUID,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID,
  booking_id UUID,
  razorpay_refund_id TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'processed', 'failed')),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds (payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds (booking_id);

ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages otps" ON public.auth_otps;
CREATE POLICY "Service role manages otps" ON public.auth_otps FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (recipient_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages notifications" ON public.notifications;
CREATE POLICY "Service role manages notifications" ON public.notifications FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Owners read own kyc" ON public.owner_kyc;
CREATE POLICY "Owners read own kyc" ON public.owner_kyc FOR SELECT USING (owner_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages owner kyc" ON public.owner_kyc;
CREATE POLICY "Service role manages owner kyc" ON public.owner_kyc FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
CREATE POLICY "Service role manages payments" ON public.payments FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages refunds" ON public.refunds;
CREATE POLICY "Service role manages refunds" ON public.refunds FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-kyc', 'owner-kyc', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Service role manages owner kyc files" ON storage.objects;
CREATE POLICY "Service role manages owner kyc files" ON storage.objects
  FOR ALL USING (bucket_id = 'owner-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'owner-kyc' AND auth.role() = 'service_role');
