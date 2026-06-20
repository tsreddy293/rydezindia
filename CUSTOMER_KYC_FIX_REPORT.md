# Customer KYC Fix Report

Generated: 2026-06-20  
Project: Rydez India (`ogfvhlqttdxfiebrpvii.supabase.co`)

---

## Executive Summary

| Item | Finding |
|------|---------|
| **Root error** | `PGRST205` — `public.customer_kyc` does not exist |
| **Storage** | `customer-kyc` bucket exists and uploads work |
| **Decision** | **Create `customer_kyc` table** — do **not** migrate docs to `customer_profiles` |
| **Code status** | Service layer updated; **SQL must be run in Supabase** |
| **Final status** | **Blocked on DB migration** until `RUN_CREATE_CUSTOMER_KYC.sql` is executed |

---

## 1. Live Supabase Schema (probed)

Command: `node scripts/probe-supabase-schema.mjs`

| Table | Exists | Notes |
|-------|--------|-------|
| `customer_profiles` | Yes | Empty; **no KYC document columns** |
| `customer_kyc` | **No** | `PGRST205` — this is the failure |
| `owner_profiles` | Yes | Has `aadhaar_document_url`, `kyc_status`, etc. |
| `vehicles` | Yes | 1 row |
| `bookings` | Yes | Empty |
| `auth_otps` | No | Not deployed (unrelated to KYC submit) |

### `customer_profiles` — KYC columns checked

| Column | Present |
|--------|---------|
| `kyc_status` | **No** |
| `status` | **No** |
| `aadhaar_front_url` | **No** |
| `aadhaar_back_url` | **No** |
| `driving_license_url` | **No** |
| `selfie_url` | **No** |
| `submitted_at` | **No** |
| `approved_at` | **No** |
| `reviewed_by` | **No** |

Base columns confirmed on live DB: `id`, `city`, `created_at` (minimal / partial 007 migration).

**Conclusion:** PostgREST hint “Perhaps you meant `customer_profiles`” is misleading — that table stores profile metadata only, not KYC documents. The app architecture matches **owner KYC** (separate doc table + profile sync), not storing docs in `customer_profiles`.

---

## 2. Intended KYC Storage Design

```
┌─────────────────────┐     ┌──────────────────────┐
│  customer_kyc       │     │  customer_profiles   │
│  (documents +       │────▶│  (kyc_status flag    │
│   review state)     │sync │   only, optional)    │
└─────────────────────┘     └──────────────────────┘
         │
         ▼
┌─────────────────────┐
│  storage:           │
│  customer-kyc       │
│  (file blobs)       │
└─────────────────────┘
```

| Layer | Table / bucket | Purpose |
|-------|----------------|---------|
| Files | `customer-kyc` bucket | PDF/JPG uploads |
| Records | `customer_kyc` | URLs + status + review timestamps |
| Sync | `users.kyc_status`, `customer_profiles.kyc_status` | Fast gate checks |

---

## 3. All `customer_kyc` Code References

| File | Usage |
|------|-------|
| `lib/services/customer-kyc.ts` | **Primary** — get, upsert, list, approve, reject |
| `server/actions/customerKyc.ts` | Rider submit + status |
| `server/actions/phase2Admin.ts` | Admin approve/reject by id or userId |
| `server/actions/adminManagement.ts` | `approveCustomerKycAction`, `rejectCustomerKycAction` |
| `lib/supabase/queries.ts` | Admin list queries |
| `lib/admin/customer-kyc-fields.ts` | Document URL parsing |
| `scripts/diagnose-customer-kyc-submit.mjs` | Infra diagnostic |
| `scripts/apply-customer-kyc.mjs` | CLI migration runner |
| `supabase/RUN_CREATE_CUSTOMER_KYC.sql` | **New** — run this |
| `supabase/RUN_CUSTOMER_KYC.sql` | Legacy equivalent |
| `supabase/migrations/008_phase2_trust_growth.sql` | Original definition (never applied) |
| `supabase/migrations/018_customer_kyc_rider_documents.sql` | Extended columns (never applied) |

---

## 4. API Functions — Status After Fix

| Function | Location | Status |
|----------|----------|--------|
| `getCustomerKyc()` | `lib/services/customer-kyc.ts` | Unchanged logic; works once table exists |
| `upsertCustomerKyc()` | `lib/services/customer-kyc.ts` | Sets `approved_at: null` on submit; structured errors |
| `approveCustomerKyc()` | `lib/services/customer-kyc.ts` | **Added** — sets `approved`, `approved_at`, `reviewed_at` |
| `rejectCustomerKyc()` | `lib/services/customer-kyc.ts` | **Added** — sets `rejected`, clears `approved_at` |
| `approveCustomerKycAction()` | `adminManagement.ts` | Delegates via `updateCustomerKycByUserId` → service |
| `rejectCustomerKycAction()` | `adminManagement.ts` | Same |
| `updateCustomerKycByUserId()` | `phase2Admin.ts` | **Refactored** to use service functions |
| `updateCustomerKycStatus()` | `phase2Admin.ts` | **Refactored** to use service functions |

---

## 5. SQL Required

**File:** `supabase/RUN_CREATE_CUSTOMER_KYC.sql`

Creates:

```sql
public.customer_kyc (
  id, user_id,
  aadhaar_front_url, aadhaar_back_url, driving_license_url, selfie_url,
  status, submitted_at, approved_at, reviewed_at, reviewed_by,
  remarks, created_at, updated_at
)
```

Plus: indexes, RLS, `customer-kyc` storage policies, optional `customer_profiles.kyc_status` column.

### How to apply

**Option A — SQL Editor (recommended)**

1. [Open SQL Editor](https://supabase.com/dashboard/project/ogfvhlqttdxfiebrpvii/sql/new)
2. Paste `supabase/RUN_CREATE_CUSTOMER_KYC.sql`
3. Run

**Option B — CLI**

```bash
# Add DATABASE_URL to .env.local first
npm run db:setup:customer-kyc
```

### Verify

```bash
npm run diagnose:kyc-submit
node scripts/probe-supabase-schema.mjs
```

Expected: `customer_kyc` EXISTS, `database_upsert_test` PASS.

---

## 6. Files Updated (this fix)

| File | Change |
|------|--------|
| `supabase/RUN_CREATE_CUSTOMER_KYC.sql` | **Created** — canonical migration |
| `lib/services/customer-kyc.ts` | Added `approveCustomerKyc`, `rejectCustomerKyc`, sync helper |
| `server/actions/phase2Admin.ts` | Admin actions delegate to service layer |
| `scripts/apply-customer-kyc.mjs` | Points to `RUN_CREATE_CUSTOMER_KYC.sql` |
| `scripts/diagnose-customer-kyc-submit.mjs` | Updated fix instructions |
| `scripts/probe-supabase-schema.mjs` | **Created** — schema audit tool |
| `CUSTOMER_KYC_FIX_REPORT.md` | This report |

---

## 7. Submit Flow (unchanged architecture)

```
/dashboard/kyc
  → RiderKycUploadForm (client validation)
  → submitCustomerKyc()
      → uploadKycDocument → customer-kyc bucket  ✅ works today
      → upsertCustomerKyc → customer_kyc table   ❌ fails (table missing)
```

---

## 8. Why NOT `customer_profiles`?

| Criterion | `customer_profiles` | `customer_kyc` |
|-----------|---------------------|----------------|
| Has doc URL columns | No | Yes (by design) |
| Matches codebase | Would require large refactor | Already used everywhere |
| Matches owner pattern | Owner uses `owner_profiles` + `owner_kyc` | Rider uses `customer_kyc` + profile sync |
| Admin list/review | No row-per-submission | Dedicated KYC rows |

Migrating to `customer_profiles` would require new columns, rewriting 15+ files, and diverging from the owner KYC pattern.

---

## 9. Final Status

| Check | Status |
|-------|--------|
| Root cause identified | ✅ Missing `customer_kyc` table |
| Storage bucket | ✅ Ready |
| Code / service layer | ✅ Ready |
| SQL migration file | ✅ `RUN_CREATE_CUSTOMER_KYC.sql` |
| DB migration applied | ❌ **Pending — user action required** |
| End-to-end KYC submit | ❌ Blocked until SQL run |

**Next step:** Run `RUN_CREATE_CUSTOMER_KYC.sql` in Supabase, then re-test submit on `/dashboard/kyc`.
