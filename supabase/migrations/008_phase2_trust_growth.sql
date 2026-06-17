-- Rydez India — Phase 2: Trust, Safety, Growth & Marketing
-- Run after 007_phase1_modules.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Customer KYC ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  aadhaar_url TEXT,
  license_url TEXT,
  selfie_url TEXT,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (
    status IN ('not_submitted', 'pending', 'verified', 'rejected')
  ),
  remarks TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_kyc_user_id ON public.customer_kyc (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_kyc_status ON public.customer_kyc (status);

-- ─── Extend owner KYC ────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.owner_kyc') IS NOT NULL THEN
    ALTER TABLE public.owner_kyc ADD COLUMN IF NOT EXISTS selfie_url TEXT;
    ALTER TABLE public.owner_kyc ADD COLUMN IF NOT EXISTS reupload_requested BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.owner_kyc ADD COLUMN IF NOT EXISTS reupload_reason TEXT;
  END IF;
END $$;

-- ─── Extend users / owners verification flags ──────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'not_submitted';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loyalty_tier TEXT NOT NULL DEFAULT 'silver';
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF to_regclass('public.owners') IS NOT NULL THEN
    ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ─── Vehicle document expiry ─────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.vehicle_documents') IS NOT NULL THEN
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS last_alert_days INTEGER;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS verified_by UUID;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
    ALTER TABLE public.vehicle_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.document_expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  alert_days_before INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_id UUID,
  UNIQUE (vehicle_id, document_type, alert_days_before, expiry_date)
);

-- ─── Admin approval audit log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'reupload_requested')),
  approved_by UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_logs_entity ON public.approval_logs (entity_type, entity_id);

-- ─── Ratings & Reviews ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  user_id UUID NOT NULL,
  vehicle_id UUID,
  owner_id UUID,
  driver_id UUID,
  rating_overall NUMERIC(2,1) NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_safety NUMERIC(2,1) CHECK (rating_safety >= 1 AND rating_safety <= 5),
  rating_cleanliness NUMERIC(2,1) CHECK (rating_cleanliness >= 1 AND rating_cleanliness <= 5),
  rating_comfort NUMERIC(2,1) CHECK (rating_comfort >= 1 AND rating_comfort <= 5),
  rating_driver NUMERIC(2,1) CHECK (rating_driver >= 1 AND rating_driver <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON public.reviews (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_owner_id ON public.reviews (owner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews (booking_id);

-- ─── Emergency contacts & SOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  contact1_name TEXT,
  contact1_phone TEXT,
  contact2_name TEXT,
  contact2_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  booking_id UUID,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'resolved')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  referred_user_id UUID,
  referred_mobile TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  referrer_reward NUMERIC(10,2) NOT NULL DEFAULT 100,
  referee_reward NUMERIC(10,2) NOT NULL DEFAULT 50,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);

-- ─── Coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  usage_limit INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id),
  user_id UUID NOT NULL,
  booking_id UUID,
  discount_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id, booking_id)
);

-- ─── Wallet ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  source TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions (user_id, created_at DESC);

-- ─── Messaging log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'whatsapp')),
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Rural pickup points ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rural_pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  village TEXT NOT NULL,
  pickup_point_name TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'Andhra Pradesh',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rural_pickup_village ON public.rural_pickup_points (village);

-- ─── Return journey seat map ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.return_journey_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_journey_id UUID NOT NULL,
  seat_number INTEGER NOT NULL CHECK (seat_number > 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'blocked')),
  booking_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (return_journey_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_return_journey_seats_journey ON public.return_journey_seats (return_journey_id);

-- Extend bookings for seat selection & rural pickup
DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS seat_numbers INTEGER[];
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rural_pickup_point_id UUID;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_id UUID;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2);
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS wallet_amount_used NUMERIC(10,2);
  END IF;
END $$;

-- Seed rural pickup points
INSERT INTO public.rural_pickup_points (village, pickup_point_name, city) VALUES
  ('Kakinada', 'Kakinada Bus Stand', 'Kakinada'),
  ('Samalkot', 'Samalkot Railway Station', 'Samalkot'),
  ('Peddapuram', 'Peddapuram Main Road', 'Peddapuram'),
  ('Mandapeta', 'Mandapeta Center', 'Mandapeta'),
  ('Amalapuram', 'Amalapuram Bus Stand', 'Amalapuram'),
  ('Rajahmundry', 'Rajahmundry APSRTC', 'Rajahmundry')
ON CONFLICT DO NOTHING;

-- Seed default coupons
INSERT INTO public.coupons (code, discount_type, discount_value, start_date, expiry_date, usage_limit) VALUES
  ('WELCOME100', 'flat', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 1000),
  ('RYDEZ50', 'flat', 50, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 5000),
  ('FIRSTTRIP', 'percentage', 15, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', 2000),
  ('SUMMER25', 'percentage', 25, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', 1000)
ON CONFLICT (code) DO NOTHING;

-- Storage bucket for customer KYC
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-kyc', 'customer-kyc', false)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.customer_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rural_pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_journey_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_expiry_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages customer kyc" ON public.customer_kyc;
CREATE POLICY "Service role manages customer kyc" ON public.customer_kyc
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own customer kyc" ON public.customer_kyc;
CREATE POLICY "Users read own customer kyc" ON public.customer_kyc
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages reviews" ON public.reviews;
CREATE POLICY "Service role manages reviews" ON public.reviews
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages wallets" ON public.wallets;
CREATE POLICY "Service role manages wallets" ON public.wallets
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read rural pickups" ON public.rural_pickup_points;
CREATE POLICY "Public read rural pickups" ON public.rural_pickup_points FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read return journey seats" ON public.return_journey_seats;
CREATE POLICY "Public read return journey seats" ON public.return_journey_seats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages all phase2" ON public.emergency_contacts;
CREATE POLICY "Service role manages all phase2" ON public.emergency_contacts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages sos" ON public.sos_events;
CREATE POLICY "Service role manages sos" ON public.sos_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages referrals" ON public.referrals;
CREATE POLICY "Service role manages referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Service role manages coupons" ON public.coupons;
CREATE POLICY "Service role manages coupons" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Service role manages coupon redemptions" ON public.coupon_redemptions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages wallet tx" ON public.wallet_transactions;
CREATE POLICY "Service role manages wallet tx" ON public.wallet_transactions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages message logs" ON public.message_logs;
CREATE POLICY "Service role manages message logs" ON public.message_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages approval logs" ON public.approval_logs;
CREATE POLICY "Service role manages approval logs" ON public.approval_logs
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages return seats" ON public.return_journey_seats;
CREATE POLICY "Service role manages return seats" ON public.return_journey_seats
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages doc alerts" ON public.document_expiry_alerts;
CREATE POLICY "Service role manages doc alerts" ON public.document_expiry_alerts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Referral code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'RYD' || UPPER(SUBSTRING(REPLACE(p_user_id::TEXT, '-', ''), 1, 5));
  RETURN code;
END;
$$;
