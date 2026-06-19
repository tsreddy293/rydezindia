-- =============================================================================
-- RYDEZ INDIA — Vehicle documents approval status
-- Supabase → SQL Editor → New query → Paste → Run
-- =============================================================================

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS documents_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (documents_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_vehicles_documents_status ON public.vehicles (documents_status);

-- Existing approved vehicles: mark documents approved so listings stay visible
UPDATE public.vehicles
SET documents_status = 'approved'
WHERE approval_status = 'approved'
  AND documents_status = 'pending'
  AND rc_document_url IS NOT NULL
  AND insurance_document_url IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ======================== END — STOP COPYING HERE ========================
