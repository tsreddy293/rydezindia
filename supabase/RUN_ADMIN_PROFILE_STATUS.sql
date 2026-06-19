-- Admin merged management — owner_profiles + customer_profiles status columns
-- Supabase → SQL Editor → Run

ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.owner_profiles ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;

ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill owner KYC from users
UPDATE public.owner_profiles op
SET kyc_status = CASE
  WHEN u.kyc_status IN ('verified', 'approved') THEN 'approved'
  WHEN u.kyc_status = 'rejected' THEN 'rejected'
  ELSE 'pending'
END
FROM public.users u
WHERE op.user_id = u.id AND u.role = 'owner';

UPDATE public.owner_profiles op
SET status = CASE
  WHEN u.owner_status = 'approved' THEN 'approved'
  WHEN u.owner_status = 'rejected' THEN 'rejected'
  ELSE 'pending'
END
FROM public.users u
WHERE op.user_id = u.id AND u.role = 'owner';

NOTIFY pgrst, 'reload schema';
