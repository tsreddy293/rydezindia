ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS owner_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_by UUID;

NOTIFY pgrst, 'reload schema';
