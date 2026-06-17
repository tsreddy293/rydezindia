-- =============================================================================
-- RYDEZ INDIA — ADD SEARCH COLUMNS TO public.vehicles
-- Supabase → SQL Editor → New query → Paste → Run
-- =============================================================================

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS daily_fare NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (daily_fare >= 0);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0);

CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON public.vehicles (is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_city ON public.vehicles (city);

UPDATE public.vehicles
SET is_active = true
WHERE approval_status = 'approved' AND is_active IS DISTINCT FROM true;

-- ======================== END — STOP COPYING HERE ========================
