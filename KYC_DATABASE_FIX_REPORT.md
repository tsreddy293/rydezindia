# KYC Database Fix Report

**Date:** 2026-06-20  
**Error:** `PGRST205` — Could not find table `public.customer_kyc`  
**Status:** Code ready — **DB migration required (one-time SQL run)**

---

## Root Cause

The application writes rider KYC records to `public.customer_kyc`. That table was defined in migrations `008` and `018` but **never applied** to the live Supabase project. Storage uploads succeed (`customer-kyc` bucket exists); the **database upsert fails** after files upload.

PostgREST suggests `customer_profiles` because that table exists — but it does **not** store KYC documents.

---

## Task 1 — `customer_profiles` Schema Audit

### SQL (also in `supabase/AUDIT_CUSTOMER_PROFILES.sql`)

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customer_profiles'
ORDER BY ordinal_position;
```

### Live probe results (PostgREST, 2026-06-20)

| Column | Present |
|--------|---------|
| `id` | Yes |
| `city` | Yes |
| `created_at` | Yes |
| `email` | Yes |
| `user_id` | **No** |
| `kyc_status` | **No** |
| `aadhaar_front_url` | **No** |
| `aadhaar_back_url` | **No** |
| `driving_license_url` | **No** |
| `selfie_url` | **No** |
| `submitted_at` | **No** |
| `approved_at` | **No** |
| `reviewed_by` | **No** |

**Conclusion:** `customer_profiles` does **NOT** contain KYC document fields. **Do not migrate code to `customer_profiles`.**

---

## Task 2 — Decision: Keep `customer_kyc` Table

| Option | Verdict |
|--------|---------|
| Move KYC to `customer_profiles` | **Rejected** — columns missing; would require schema + 15+ file refactor |
| Create `customer_kyc` table | **Selected** — matches existing code and owner KYC pattern |

---

## Task 3 — SQL Migration (REQUIRED)

**File:** `supabase/RUN_CREATE_CUSTOMER_KYC.sql`

Creates:

| Column | Type |
|--------|------|
| `id` | UUID PRIMARY KEY |
| `user_id` | UUID UNIQUE NOT NULL |
| `aadhaar_front_url` | TEXT |
| `aadhaar_back_url` | TEXT |
| `driving_license_url` | TEXT |
| `selfie_url` | TEXT |
| `status` | TEXT DEFAULT `'pending'` |
| `submitted_at` | TIMESTAMPTZ |
| `approved_at` | TIMESTAMPTZ |
| `reviewed_by` | UUID |
| `created_at` | TIMESTAMPTZ DEFAULT now() |
| `updated_at` | TIMESTAMPTZ DEFAULT now() |

Also: RLS policies, `customer-kyc` storage policies, indexes.

### Apply now

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/ogfvhlqttdxfiebrpvii/sql/new)
2. Paste **entire** `supabase/RUN_CREATE_CUSTOMER_KYC.sql`
3. Click **Run**

**Or CLI** (add `DATABASE_URL` to `.env.local`):

```bash
npm run db:setup:customer-kyc
```

### Verify

```bash
npm run diagnose:kyc-submit
npm run probe:schema
```

---

## Task 4 — Code References (`customer_kyc`)

| File | Role |
|------|------|
| `lib/services/customer-kyc.ts` | `getCustomerKyc`, `upsertCustomerKyc`, `approveCustomerKyc`, `rejectCustomerKyc` |
| `server/actions/customerKyc.ts` | `submitCustomerKyc`, `getCustomerKycStatus` |
| `server/actions/phase2Admin.ts` | Admin approve/reject by id |
| `server/actions/adminManagement.ts` | `approveCustomerKycAction`, `rejectCustomerKycAction` |
| `app/dashboard/kyc/page.tsx` | Rider upload page |
| `components/forms/RiderKycUploadForm.tsx` | Submit form |
| `lib/kyc/self-drive-gate.ts` | Self-drive booking gate |
| `app/booking/[id]/page.tsx` | Self-drive KYC gate UI |
| `lib/supabase/queries.ts` | Admin customer list |

**No migration to `customer_profiles` required** — all references stay on `customer_kyc`.

---

## Task 5 — Files Updated (This Fix)

| File | Change |
|------|--------|
| `supabase/RUN_CREATE_CUSTOMER_KYC.sql` | Urgent migration (status default `pending`) |
| `supabase/migrations/020_create_customer_kyc.sql` | Versioned migration copy |
| `supabase/AUDIT_CUSTOMER_PROFILES.sql` | Schema audit query |
| `lib/services/customer-kyc.ts` | `isCustomerKycTableReady()`, clearer missing-table logs |
| `server/actions/customerKyc.ts` | Surface DB missing error on page load (dev) |
| `app/dashboard/kyc/page.tsx` | Show `loadError`, disable submit when table missing |
| `KYC_DATABASE_FIX_REPORT.md` | This report |

Previously updated (still valid):

- `approveCustomerKyc()` / `rejectCustomerKyc()` in service layer
- `phase2Admin.ts` delegates to service
- Dev-mode submit errors via `lib/kyc/kyc-errors.ts`

---

## Submit Flow (After SQL)

```
/dashboard/kyc
  → getCustomerKycStatus()     → customer_kyc SELECT
  → submitCustomerKyc()
      → uploadKycDocument()    → customer-kyc bucket ✅
      → upsertCustomerKyc()    → customer_kyc UPSERT ✅ (after SQL)

/booking/[id] (self-drive)
  → checkSelfDriveKycGate()  → getCustomerKyc()
  → redirects to /dashboard/kyc if not approved
```

---

## Final Solution

| Layer | Action |
|-------|--------|
| **Database** | Run `RUN_CREATE_CUSTOMER_KYC.sql` once |
| **Application** | No table rename; code already targets `customer_kyc` |
| **Verification** | `npm run diagnose:kyc-submit` → all PASS |
| **User test** | Submit KYC at `/dashboard/kyc` → success + status Pending |

**Blocking item:** SQL must be executed in Supabase Dashboard. `DATABASE_URL` is not in `.env.local`, so automated apply is not available from this environment.

After SQL run, reply **verify again** to confirm table + upsert test.
