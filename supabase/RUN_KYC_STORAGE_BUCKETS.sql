-- =============================================================================
-- RYDEZ INDIA — KYC Storage buckets (owner-kyc + customer-kyc)
-- Supabase → SQL Editor → New query → Paste → Run
-- Safe to run multiple times.
-- =============================================================================

-- Owner KYC documents (owner_profiles uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-kyc', 'owner-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Service role manages owner kyc storage" ON storage.objects;
CREATE POLICY "Service role manages owner kyc storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'owner-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'owner-kyc' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read owner kyc" ON storage.objects;
CREATE POLICY "Public read owner kyc"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'owner-kyc');

-- Rider self-drive KYC documents (customer_kyc uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-kyc', 'customer-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Service role manages customer kyc storage" ON storage.objects;
CREATE POLICY "Service role manages customer kyc storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'customer-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'customer-kyc' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read customer kyc" ON storage.objects;
CREATE POLICY "Public read customer kyc"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-kyc');

NOTIFY pgrst, 'reload schema';
