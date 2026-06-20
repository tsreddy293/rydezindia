# Customer KYC Implementation Report

**Date:** 2026-06-20  
**Error fixed:** `PGRST205` — `public.customer_kyc` not found  
**Solution:** Create dedicated `customer_kyc` table (not `customer_profiles`)

---

## Root Cause

| Item | Finding |
|------|---------|
| App expects | `public.customer_kyc` |
| Live DB has | `customer_profiles` only (id, full_name, email, city, mobile, created_at) |
| KYC columns on profiles | **None** |
| Storage | `customer-kyc` bucket exists — uploads work |
| Failure point | `upsertCustomerKyc()` → PostgREST cannot find table |

---

## Decision

**Do not migrate to `customer_profiles`.** Create `customer_kyc` as designed — matches owner pattern (`owner_profiles` + documents) and all existing code.

---

## SQL Generated

**File:** `supabase/RUN_CREATE_CUSTOMER_KYC.sql`

```sql
CREATE TABLE public.customer_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  aadhaar_front_url text,
  aadhaar_back_url text,
  driving_license_url text,
  selfie_url text,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  reviewed_by uuid,
  remarks text,
  self_drive_return_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_customer_kyc_user ON customer_kyc(user_id);
-- + RLS policies, storage policies, FK to users
```

### Apply (required once)

1. [Supabase SQL Editor](https://supabase.com/dashboard/project/ogfvhlqttdxfiebrpvii/sql/new)
2. Paste full `supabase/RUN_CREATE_CUSTOMER_KYC.sql`
3. Run

Or: `npm run db:setup:customer-kyc` (needs `DATABASE_URL` in `.env.local`)

Verify: `npm run diagnose:kyc-submit`

---

## API Updates

| Function | File | Behavior |
|----------|------|----------|
| `getCustomerKyc()` | `lib/services/customer-kyc.ts` | SELECT from `customer_kyc` by `user_id` |
| `upsertCustomerKyc()` | `lib/services/customer-kyc.ts` | UPSERT docs + `status='pending'` + `submitted_at` + optional `self_drive_return_path` |
| `approveCustomerKyc()` | `lib/services/customer-kyc.ts` | `status='approved'`, `approved_at=now()`, clears `rejected_at` |
| `rejectCustomerKyc()` | `lib/services/customer-kyc.ts` | `status='rejected'`, `rejected_at=now()`, clears `approved_at` |
| `submitCustomerKyc()` | `server/actions/customerKyc.ts` | Upload files → `upsertCustomerKyc()` |
| `getCustomerKycStatus()` | `server/actions/customerKyc.ts` | Table readiness check + status from `customer_kyc` |
| `approveCustomerKycAction()` | `adminManagement.ts` | Delegates to `approveCustomerKyc()` |
| `updateCustomerKycByUserId()` | `phase2Admin.ts` | Approve/reject via service + notification with return path |
| `getAdminCustomerManagementList()` | `lib/supabase/queries.ts` | Reads `customer_kyc` rows for docs + status (kyc table first) |

---

## Pages & Flows

### Upload KYC (`/dashboard/kyc`)

- `RiderKycUploadForm` → `submitCustomerKyc` → storage + `customer_kyc` upsert
- Passes `self_drive_return` hidden field for booking redirect
- Shows dev error if table missing

### Admin Customer Management (`/admin/customer-management`)

- `getAdminCustomerManagementList()` loads `selectRows("customer_kyc", "*")`
- Approve KYC → `approveCustomerKyc()` → `status='approved'`

### Self-drive booking redirect (Task 7)

| Trigger | Behavior |
|---------|----------|
| KYC already approved + `?return=/booking/...` | Server `redirect()` to booking |
| KYC approved + stored `self_drive_return_path` | Server redirect even without URL param |
| KYC pending + user waiting on page | `SelfDriveKycAutoRedirect` polls every 8s → redirect when approved |
| After admin approve | Notification includes `metadata.returnPath` |

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/RUN_CREATE_CUSTOMER_KYC.sql` | Canonical migration (user spec + RLS + storage) |
| `supabase/migrations/020_create_customer_kyc.sql` | Versioned copy |
| `lib/services/customer-kyc.ts` | `rejected_at`, `self_drive_return_path`, approve/reject |
| `server/actions/customerKyc.ts` | Return path on submit, table check |
| `server/actions/phase2Admin.ts` | Approve notification with booking return |
| `lib/supabase/queries.ts` | Admin list prefers `customer_kyc.status` |
| `app/dashboard/kyc/page.tsx` | Server redirect + auto-poll component |
| `components/forms/RiderKycUploadForm.tsx` | Hidden `self_drive_return` field |
| `components/kyc/SelfDriveKycAutoRedirect.tsx` | **New** — poll until approved |
| `CUSTOMER_KYC_IMPLEMENTATION_REPORT.md` | This report |

---

## Testing Steps

### 1. Database

```bash
npm run diagnose:kyc-submit   # expect exit 0 after SQL
npm run probe:schema          # customer_kyc EXISTS
```

### 2. Rider upload

1. Open `/dashboard/kyc?reason=self_drive&return=/booking/{id}?type=self_drive`
2. Upload Aadhaar front/back, license, selfie
3. Submit → success message, status **Pending**
4. Confirm row in Supabase Table Editor → `customer_kyc`

### 3. Admin approve

1. `/admin/customer-management` → find rider → **Approve KYC**
2. Confirm `customer_kyc.status = 'approved'`, `approved_at` set

### 4. Redirect to booking

1. Rider on KYC page (pending) → admin approves → auto-redirect within ~8s  
   **OR** reload KYC page → immediate redirect to booking  
2. Booking page → self-drive gate shows **allowed**

### 5. Regression

- Guest self-drive → login → KYC (not `/admin`)
- Rejected KYC → re-upload works
- Storage bucket still accepts PDF/JPG

---

## Final Status

| Layer | Status |
|-------|--------|
| SQL migration file | ✅ Ready |
| Application code | ✅ Ready |
| Admin reads `customer_kyc` | ✅ |
| Upload writes `customer_kyc` | ✅ |
| Approve sets `status='approved'` | ✅ |
| Post-approval booking redirect | ✅ |
| **Live database** | ❌ **Run SQL to create table** |

After running `RUN_CREATE_CUSTOMER_KYC.sql`, KYC submit will work end-to-end.
