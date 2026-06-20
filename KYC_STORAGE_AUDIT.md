# KYC Storage Audit

**Date:** 2026-06-17  
**Issue:** Rider self-drive KYC upload showed raw Supabase error `"Bucket not found"`  
**Build verification:** `npm run build` — passed after fix

---

## Bucket Standard

| Role | Bucket ID | Public | Purpose |
|------|-----------|--------|---------|
| **Owner KYC** | `owner-kyc` | Yes | Owner profile documents (`owner_profiles`) |
| **Customer / Rider KYC** | `customer-kyc` | Yes | Self-drive rider documents (`customer_kyc`) |

Two buckets are used (not a single `kyc-documents` bucket) to match existing schema, RLS policies, and migration history. Both are defined in `lib/kyc/kyc-storage.ts` as `KYC_STORAGE_BUCKETS`.

---

## Storage Paths

| Flow | Service | Object path pattern | Example |
|------|---------|---------------------|---------|
| Rider KYC | `lib/services/customer-kyc.ts` | `{userId}/{key}-{timestamp}.{ext}` | `abc-123/aadhaar-front-1718654321.jpg` |
| Owner KYC | `lib/services/owner-profile-kyc.ts` | `{userId}/{field}-{timestamp}.{ext}` | `def-456/aadhaar_document_url-1718654321.pdf` |
| Legacy owner_kyc | `lib/services/kyc.ts` | `{ownerId}/{key}-{timestamp}.{ext}` | Same bucket `owner-kyc` |

Uploads use the **service role** via `createAdminClient()`; buckets must exist in Supabase Storage.

---

## Upload Limits & File Types

Defined in `lib/kyc/upload-rules.ts` — enforced client-side (forms) and server-side (actions).

| Document | Max size | Allowed types |
|----------|----------|---------------|
| Aadhaar Front | 500 KB | JPG, JPEG, PNG, PDF |
| Aadhaar Back | 500 KB | JPG, JPEG, PNG, PDF |
| Driving License | 500 KB | JPG, JPEG, PNG, PDF |
| Selfie | 300 KB | JPG, JPEG, PNG |

**Owner KYC mapping** (single Aadhaar file uses Aadhaar Front rules):

| Owner field | Rule applied |
|-------------|--------------|
| `aadhaar` | Aadhaar Front (500 KB, JPG/PNG/PDF) |
| `license` | Driving License (500 KB, JPG/PNG/PDF) |
| `selfie` | Selfie (300 KB, JPG/PNG) |
| `address_proof` | Aadhaar Front (500 KB, JPG/PNG/PDF) |

---

## Image Compression

| Component | Behavior |
|-----------|----------|
| `lib/kyc/compress-image.ts` | Client-side resize (max 1600px) + JPEG/PNG re-encode before upload |
| `RiderKycUploadForm.tsx` | Validates → compresses → re-validates size |
| `OwnerKycUploadForm.tsx` | Same pattern (added in this fix) |

PDF files are uploaded as-is (no compression). Output formats are **JPEG or PNG only** (WebP removed to match allowed types).

---

## Root Cause

The `customer-kyc` Storage bucket was **not created** in the target Supabase project (or was never applied from migrations `018` / `RUN_CUSTOMER_KYC.sql`). Upload code in `customer-kyc.ts` called `storage.from('customer-kyc').upload()` which returned Supabase's raw `"Bucket not found"` message.

---

## Fix Applied

### 1. Centralized storage module — `lib/kyc/kyc-storage.ts`

- Bucket constants: `owner-kyc`, `customer-kyc`
- `ensureKycBucketExists()` — checks bucket via `getBucket` / `listBuckets` before upload (5-minute cache)
- `uploadKycDocument()` — shared upload with validation
- `mapKycStorageError()` — maps missing bucket to user-friendly message:

  > Document storage is temporarily unavailable. Please try again later.

### 2. Services updated

| File | Change |
|------|--------|
| `lib/services/customer-kyc.ts` | Uses `uploadKycDocument` + `KYC_STORAGE_BUCKETS.customer` |
| `lib/services/owner-profile-kyc.ts` | Uses `uploadKycDocument` + `KYC_STORAGE_BUCKETS.owner` |
| `lib/services/kyc.ts` | Uses shared upload helper |

### 3. Server actions

| File | Change |
|------|--------|
| `server/actions/customerKyc.ts` | `mapKycStorageError` in catch; server-side file validation |
| `server/actions/ownerKyc.ts` | Owner file validation + `mapKycStorageError` |

### 4. Owner upload form

| File | Change |
|------|--------|
| `components/forms/OwnerKycUploadForm.tsx` | Client validation, compression, explicit accept limits |

### 5. SQL — create buckets in Supabase

Run **one** of:

- **Migration:** `supabase/migrations/020_kyc_storage_buckets.sql`
- **SQL Editor (recommended for production now):** `supabase/RUN_KYC_STORAGE_BUCKETS.sql`

Also creates/updates storage policies for service role upload + public read.

---

## Production Checklist

1. Open **Supabase Dashboard → SQL Editor**
2. Run `supabase/RUN_KYC_STORAGE_BUCKETS.sql`
3. Verify **Storage → Buckets** shows:
   - `owner-kyc` (public)
   - `customer-kyc` (public)
4. Retry rider KYC upload at `/dashboard/kyc`
5. If bucket was just created, wait ~30s or refresh app (bucket check cache expires in 5 min)

---

## Files Reference

| Purpose | Path |
|---------|------|
| Bucket constants + validation | `lib/kyc/kyc-storage.ts` |
| Size/type rules | `lib/kyc/upload-rules.ts` |
| Image compression | `lib/kyc/compress-image.ts` |
| Rider upload service | `lib/services/customer-kyc.ts` |
| Owner upload service | `lib/services/owner-profile-kyc.ts` |
| Rider upload form | `components/forms/RiderKycUploadForm.tsx` |
| Owner upload form | `components/forms/OwnerKycUploadForm.tsx` |
| Bucket SQL (runbook) | `supabase/RUN_KYC_STORAGE_BUCKETS.sql` |
| Bucket migration | `supabase/migrations/020_kyc_storage_buckets.sql` |

---

*End of audit.*
