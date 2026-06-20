-- Rydez India — KYC storage buckets (owner-kyc + customer-kyc)
-- Safe to run multiple times. Creates buckets and storage policies if missing.

-- Owner KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('owner-kyc', 'owner-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Service role manages owner kyc storage" ON storage.objects;
CREATE POLICY "Service role manages owner kyc storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'owner-kyc' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'owner-kyc' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read owner kyc" ON storage.objects;
CREATE POLICY "Public read owner kyc"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'owner-kyc');

-- Rider / customer self-drive KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-kyc', 'customer-kyc', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

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
