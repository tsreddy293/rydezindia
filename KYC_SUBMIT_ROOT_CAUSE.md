# KYC Submit Root Cause Analysis

Generated: 2026-06-20T13:00:33.688Z  
Supabase: https://ogfvhlqttdxfiebrpvii.supabase.co  
Test user: `00000000-0000-4000-8000-000000000001`

## Submit Flow (code path)

```
app/dashboard/kyc/page.tsx
  → requireRole("user")                    [auth]
  → RiderKycUploadForm.onSubmit
      → validateKycUploadFile (client)     [validation]
      → prepareKycFileForUpload (client)
  → submitCustomerKyc (server action)
      → requireRole("user")                [auth]
      → uploadIfPresent × 4
          → uploadCustomerKycFile
              → uploadKycDocument          [storage: customer-kyc bucket]
      → upsertCustomerKyc                  [database: customer_kyc table]
      → markSelfDriveInterest              [profile]
      → createNotification                 [notification]
```

## Verification Results

- **customer_kyc_bucket**: PASS — Bucket 'customer-kyc' exists (public: true)
- **customer_kyc_table**: PASS — Table public.customer_kyc exists
- **customer_kyc_status_column**: PASS — Column 'status' readable via PostgREST
- **storage_upload_test**: PASS — Service-role upload succeeded
- **database_upsert_test**: PASS — Upsert succeeded (test row written)
- **auth_session**: N/A — Browser auth not tested here. submitCustomerKyc uses requireRole('user') → rider session via cookies.

## Simulated Submit

```json
{
  "ok": true,
  "step": "upsertCustomerKyc",
  "row": {
    "id": "2ca33219-5d5b-4c3f-90c5-301e1efc903c",
    "user_id": "00000000-0000-4000-8000-000000000001",
    "status": "pending"
  }
}
```

## Root Cause

No infrastructure failure detected in automated checks.


## Required Fix

None — infrastructure OK; inspect runtime auth/validation in dev server logs.

## Development Mode Errors

After code update, `NODE_ENV=development` shows labeled errors on the KYC form:

- `Storage Error: ...`
- `Database Error: ...`
- `Auth Error: ...`

Production continues to show user-friendly messages.

## Manual Steps (if table missing)

1. [Supabase SQL Editor](https://supabase.com/dashboard/project/ogfvhlqttdxfiebrpvii/sql/new)
2. Run `supabase/RUN_CUSTOMER_KYC.sql`
3. Re-run: `node scripts/diagnose-customer-kyc-submit.mjs`
