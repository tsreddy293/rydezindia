-- Add unique constraint on user_id if table was created without it (fixes upsert 42P10)

DO $$
BEGIN
  IF to_regclass('public.customer_kyc') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'customer_kyc_user_id_key'
    ) THEN
      ALTER TABLE public.customer_kyc ADD CONSTRAINT customer_kyc_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
