-- Owner profile status columns (kyc_status + owner_status)
-- Applied via Supabase SQL Editor — see RUN_FIX_KYC_APPROVAL.sql for copy-paste script.

ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_approved_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
