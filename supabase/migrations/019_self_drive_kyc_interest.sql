-- Rydez India — Self-drive KYC interest tracking (KYC required only for self-drive)

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS self_drive_interest BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS self_drive_interest_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customer_profiles_self_drive_interest
  ON public.customer_profiles (self_drive_interest)
  WHERE self_drive_interest = true;

NOTIFY pgrst, 'reload schema';
