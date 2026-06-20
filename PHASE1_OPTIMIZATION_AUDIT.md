# Rydez India — Phase 1 Optimization & Cleanup Audit

**Date:** June 2025  
**Stack:** Next.js 16, TypeScript, Supabase, PostgreSQL  
**Scope:** Booking approval, customer onboarding, KYC rules, OTP flow, cleanup, performance

---

## 1. Architecture Report

### Current architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App Router (app/)                                   │
│  ├── Public: search-*, booking/*, marketing pages            │
│  ├── Rider: /dashboard, /user/* (alias routes)             │
│  ├── Owner: /owner/*                                         │
│  └── Admin: /admin/*                                         │
├─────────────────────────────────────────────────────────────┤
│  Server Actions (server/actions/)                            │
│  ├── createBooking.ts — all booking creation                 │
│  ├── auth.ts — signup/login/roles                            │
│  └── adminManagement.ts — owner/customer approvals           │
├─────────────────────────────────────────────────────────────┤
│  Services (lib/services/)                                    │
│  ├── verification.ts — owner/customer booking gates          │
│  ├── customer-kyc.ts / owner-profile-kyc.ts                  │
│  ├── otp.ts — OTP send/verify                                │
│  └── customer-profile.ts — self-drive interest tracking      │
├─────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Storage + Auth)                      │
│  ├── owner_profiles — source of truth for owner/KYC status   │
│  ├── customer_kyc — rider KYC (self-drive only)              │
│  ├── vehicles — marketplace listings                         │
│  └── auth_otps — booking/signup OTP                          │
└─────────────────────────────────────────────────────────────┘
```

### Source-of-truth matrix

| Data | Primary table | Admin UI reads | Booking gate reads |
|------|---------------|----------------|-------------------|
| Owner status | `owner_profiles.owner_status` | ✅ | ✅ (fixed) |
| Owner KYC | `owner_profiles.kyc_status` | ✅ | ✅ (fixed) |
| Vehicle status | `vehicles.approval_status` | ✅ | ✅ |
| Customer KYC | `customer_kyc.status` | ✅ | Self-drive only |
| OTP verified | `auth_otps.verified_at` | — | All bookings |

### Business rules (implemented)

| Service type | Customer OTP | Customer KYC | Owner approved |
|--------------|-------------|--------------|----------------|
| Local rental (`search-local` / `with_driver`) | ✅ Required | ❌ Not checked | ✅ Required |
| Outstation / return journey | ✅ Required | ❌ Not checked | ✅ Required |
| Self drive | ✅ Required | ✅ Required + admin approved | ✅ Required |

---

## 2. Bug Fix Report

### Bug: “Owner not verified yet” despite Admin showing Approved

**Root cause:** `isOwnerKycVerified()` read legacy columns only (`users.kyc_status`, `owner_kyc`, `owners.kyc_verified`). Admin writes approvals to **`owner_profiles`**.

**Fix (already in `lib/services/verification.ts`):**
- `fetchOwnerBookingGateSnapshot()` — parallel fresh reads from `owner_profiles`, `users`, legacy tables, `vehicles`
- Uses same merge helpers as Admin (`resolveOwnerAdminStatus`, `resolveOwnerKycAdminStatus`)
- Booking allowed when: `owner_status=approved` AND `kyc_status=approved` AND `vehicle_status=approved`
- Debug logging prints full snapshot JSON on every gate check
- `adminManagement.ts` syncs `users.kyc_status` / `users.owner_status` on approve

**Validation entry points:**

| File | Function | When |
|------|----------|------|
| `server/actions/createBooking.ts` | `assertOwnerCanReceiveBookings(ownerId, vehicleId)` | Return journey + marketplace |
| `server/actions/createBooking.ts` | `assertCustomerCanBookSelfDrive(userId)` | Self-drive only |
| `server/actions/createBooking.ts` | `assertRecentBookingOtp(mobile)` | All bookings |
| `app/booking/[id]/page.tsx` | `checkSelfDriveKycGate()` | Self-drive page (UI gate) |

**No caching:** All checks use `createAdminClient()` with live queries per request.

---

## 3. File Cleanup Report

> **No files were deleted.** Review and approve before removing.

### SAFE TO DELETE (high confidence — unused or legacy)

| Path | Reason |
|------|--------|
| `server/` (entire Express/MongoDB folder) | Legacy Node server; app uses Next.js + Supabase. Includes `server/index.js`, routes, models, `node_modules/` |
| `components/forms/MarketplaceBookingForm.tsx` | Zero imports in codebase; superseded by `UnifiedBookingForm` |
| `server/actions/kyc.ts` | No imports; superseded by `ownerKyc.ts` + `owner-profile-kyc.ts` |
| `app/admin/kyc/page.tsx` | Redirect alias only; `admin-modules.ts` redirects to `/admin/owner-management` |
| `app/admin/owners/page.tsx` | Redirect alias to owner-management |
| `app/admin/customer-kyc/page.tsx` | Redirect alias to customer-management |
| `app/user/login/page.tsx` | Redirect to `/login/rider` via proxy |
| `app/user/register/page.tsx` | Likely redirect; duplicate of `/signup/rider` |

### REVIEW BEFORE DELETE (aliases / SEO / backward compatibility)

| Path | Notes |
|------|-------|
| `app/dashboard/page.tsx` | Re-exports `user/dashboard` — keep for `/dashboard` URL |
| `app/user/profile/kyc/page.tsx` | Alias of `/dashboard/kyc` — keep until links updated |
| `app/user/dashboard/verification/page.tsx` | Overlaps KYC page — consider merging later |
| `app/privacy/page.tsx` vs `app/privacy-policy/page.tsx` | Duplicate legal pages — pick canonical |
| `app/contact/page.tsx` vs `app/contact-us/page.tsx` | Duplicate contact pages |
| `app/terms/page.tsx` vs `app/terms-and-conditions/page.tsx` | Duplicate terms pages |
| `app/refund/page.tsx` vs `app/refund-policy/page.tsx` | Duplicate refund pages |
| `app/login/page.tsx` | Role picker — may still be linked from marketing |
| `components/vehicles/SearchResultCard.tsx` | Used by legacy `/search`; `VehicleSearchResultCard` used by new search |
| `components/vehicles/MarketplaceResultCard.tsx` | Verify usage before delete |
| `supabase/RUN_*.sql` (17 files) | Operational scripts — keep but consolidate into migration docs |
| `supabase/migrations/001–006` | Early marketplace experiments — verify production never used |

### REQUIRED FILES (do not delete)

| Category | Key paths |
|----------|-----------|
| Booking | `createBooking.ts`, `UnifiedBookingForm.tsx`, `BookingForm.tsx`, `booking/[id]/page.tsx` |
| Owner KYC | `owner-profile-kyc.ts`, `ownerKyc.ts`, `adminManagement.ts`, `RUN_OWNER_PROFILE_KYC.sql` |
| Customer KYC | `customer-kyc.ts`, `customerKyc.ts`, `RiderKycUploadForm.tsx`, `RUN_CUSTOMER_KYC.sql` |
| Auth | `auth.ts`, `proxy.ts`, `lib/auth/roles.ts` |
| Admin | `AdminOwnerManagementClient.tsx`, `AdminVehiclesClient.tsx`, `AdminCustomerManagementClient.tsx` |
| OTP | `lib/services/otp.ts`, `api/auth/send-otp`, `api/auth/verify-otp`, `BookingOtpVerification.tsx` |
| Search | `SearchWithMaps.tsx`, `queries.ts` (marketplace fetch) |

---

## 4. Database Changes

### Already applied in code (run in Supabase if missing)

| Script | Purpose |
|--------|---------|
| `RUN_OWNER_PROFILE_KYC.sql` | `owner_profiles` KYC document columns + status |
| `RUN_ADMIN_PROFILE_STATUS.sql` | `owner_status`, `kyc_status` on profiles |
| `RUN_CUSTOMER_KYC.sql` | `customer_kyc` table + `customer-kyc` bucket |
| `RUN_SELF_DRIVE_KYC.sql` | `customer_profiles.self_drive_interest` |
| `008_phase2_trust_growth.sql` | `auth_otps` table for OTP |

### Recommended indexes (performance)

```sql
CREATE INDEX IF NOT EXISTS idx_owner_profiles_user_status
  ON public.owner_profiles (user_id, owner_status, kyc_status);

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_approval
  ON public.vehicles (owner_id, approval_status);

CREATE INDEX IF NOT EXISTS idx_auth_otps_mobile_purpose
  ON public.auth_otps (mobile, purpose, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_user_type
  ON public.bookings (user_id, booking_type);
```

---

## 5. SQL Scripts Required (production checklist)

Run in Supabase SQL Editor if not already applied:

1. `supabase/RUN_OWNER_PROFILE_KYC.sql`
2. `supabase/RUN_ADMIN_PROFILE_STATUS.sql`
3. `supabase/RUN_CUSTOMER_KYC.sql`
4. `supabase/RUN_SELF_DRIVE_KYC.sql`
5. `supabase/migrations/008_phase2_trust_growth.sql` (auth_otps)
6. Index block above (optional but recommended)

---

## 6. Parts 2–7 Implementation Status

| Part | Status | Details |
|------|--------|---------|
| **2 – Welcome dashboard** | ✅ Done | `Welcome, {name}` from `users.name` |
| **3 – KYC rules** | ✅ Done | Customer KYC only for self-drive |
| **4 – KYC workflow** | ✅ Done | Hidden until self-drive interest; gate on booking page |
| **5 – File limits** | ✅ Done | 500KB docs, 300KB selfie, compression |
| **6 – OTP flow** | ✅ Done | `BookingOtpVerification` + server `assertRecentBookingOtp` |
| **7 – Admin** | ✅ Partial | Customer mgmt streamlined; owner/vehicle admin already has badges |

---

## 7. Performance Audit

### Issues found

| Issue | Location | Impact | Recommendation |
|-------|----------|--------|----------------|
| **N+1 owner lookups** | `getOwnerMarketplaceEligibilityMap` called per vehicle batch | Medium | Already batched by owner ID set — OK |
| **Duplicate vehicle queries** | `getSelfDriveListingById` + booking gate both read vehicle | Low | Acceptable for correctness |
| **Large client components** | `SearchWithMaps.tsx`, `UnifiedBookingForm.tsx` | Medium | Split OTP/pricing into subcomponents (done for OTP) |
| **Singleton admin client** | `lib/supabase/admin.ts` | Low | OK — connection reuse, no stale data |
| **Legacy table fallbacks** | Multiple `select` retries on missing columns | Low | Keep for prod schema drift tolerance |
| **`server/` MongoDB folder** | 1700+ files in node_modules | Disk/build noise | Delete entire `server/` folder after review |

### Recommended optimizations (next phase)

1. Consolidate `RUN_*.sql` into single `PRODUCTION_SETUP.sql` with idempotent blocks
2. Merge duplicate legal/marketing routes (`/privacy` → `/privacy-policy` 301)
3. Remove legacy `SearchResultCard` after confirming `/search` traffic
4. Add React `cache()` wrapper for read-only listing queries with short TTL
5. Lazy-load Google Maps in search pages

---

## 8. Production Readiness Checklist

### Pre-deploy

- [ ] Run all SQL scripts in Section 5 on production Supabase
- [ ] Set `OTP_SECRET` env var (production)
- [ ] Configure SMS provider in `lib/services/messaging.ts` for live OTP delivery
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` on Vercel
- [ ] Deploy latest build (passes `npm run build`)

### Post-deploy smoke tests

- [ ] Owner approved in Admin → book **with driver** vehicle → succeeds
- [ ] Book **self-drive** without KYC → blocked with upload prompt
- [ ] Book self-drive with approved KYC → succeeds after OTP
- [ ] Return journey booking → OTP required, no customer KYC
- [ ] Rider dashboard shows **Welcome, {Name}** without KYC card (until self-drive search)
- [ ] Admin Customer Management: search, approve/reject KYC

### Monitoring

- [ ] Watch server logs for `[assertOwnerCanReceiveBookings] snapshot` on booking failures
- [ ] Watch `[OTP]` logs in dev; SMS delivery logs in prod

---

## 9. Files Changed This Phase

| File | Change |
|------|--------|
| `lib/services/verification.ts` | Owner gate reads `owner_profiles`; simplified vehicle check |
| `lib/services/otp.ts` | `assertRecentBookingOtp()` for booking |
| `server/actions/createBooking.ts` | OTP + owner/vehicle gate on all bookings |
| `components/booking/BookingOtpVerification.tsx` | **New** reusable OTP UI |
| `components/forms/UnifiedBookingForm.tsx` | OTP integration |
| `components/forms/BookingForm.tsx` | OTP integration |
| `components/forms/FormField.tsx` | Optional `value`/`onChange` |

---

## 10. Summary

Phase 1 delivers:

1. **Fixed booking approval bug** — gates align with Admin `owner_profiles` data  
2. **Simplified rider onboarding** — no KYC unless self-drive  
3. **OTP-first booking** for all trip types  
4. **Self-drive** = OTP + KYC + owner/vehicle approval  
5. **Cleanup report** — 8 safe-delete candidates identified, nothing removed  
6. **Production checklist** — SQL, env, smoke tests documented  

Signup, login, owner onboarding, vehicle onboarding, and admin dashboard flows are unchanged in structure and remain functional.
