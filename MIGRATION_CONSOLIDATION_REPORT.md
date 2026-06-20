# Migration Consolidation Report

**Project:** Rydez India  
**Date:** 2026-06-17  
**Scope:** `supabase/migrations/` (001–019) vs `supabase/RUN_*.sql` (15 scripts)  
**Action taken:** Audit only — no migrations or scripts deleted.

---

## Executive Summary

The database layer has **two parallel tracks**: versioned migrations (001–019) and manual SQL Editor scripts (`RUN_*.sql`). Migrations **012–019** (and their RUN twins) represent the **current app schema**. Migrations **001–006** are **legacy marketplace experiments** with conflicting `vehicles` table definitions. Several RUN scripts are **production hotfixes** not captured in the migration chain.

| Category | Count |
|----------|-------|
| Versioned migrations | 19 |
| RUN scripts | 15 |
| Near-duplicate RUN ↔ migration pairs | 11 |
| RUN-only (no migration equivalent) | 5 |
| Migrations 001–011 with no RUN script | 11 |

---

## 1. Duplicate / Overlapping Pairs (RUN ↔ Migration)

| RUN Script | Migration(s) | Overlap Quality | Notes |
|------------|--------------|-----------------|-------|
| `RUN_VEHICLES_TABLE.sql` | **012** | ~Identical | Same `vehicles` table, RLS, trigger, bucket. RUN adds explicit GRANTs. |
| `RUN_VEHICLES_SEARCH_COLUMNS.sql` | **013** | ~Identical | `is_active`, `city`, `daily_fare`, `security_deposit`. |
| `RUN_VEHICLE_SERVICE_AVAILABILITY.sql` | **014** | ~Identical | Service flags + indexes. |
| `RUN_OWNER_STATUS.sql` | **015** | Partial | Both add `users.owner_status`. RUN adds kyc_status backfill. |
| `RUN_OWNER_PROFILE_KYC.sql` | **007, 011, 016, 017** | Combined superset | Single script merges owner_profiles evolution. Default `kyc_status` differs (`pending` vs `not_submitted`). |
| `RUN_FIX_KYC_APPROVAL.sql` | **017** | Subset | Owner approval columns only; wrapped in DO guard. |
| `RUN_ADMIN_PROFILE_STATUS.sql` | **017** (+ extra) | Partial + extra | Overlaps 017; also adds `customer_profiles` status columns (**no migration**). |
| `RUN_CUSTOMER_KYC.sql` | **018** (supersedes **008**) | ~Identical | Split Aadhaar URLs, bucket, RLS. RUN migrates `verified`→`approved`. |
| `RUN_SELF_DRIVE_KYC.sql` | **019** | Identical | `customer_profiles.self_drive_interest`. |
| `RUN_NOTIFICATIONS_TABLE.sql` | **006** | ~Identical | Same table + RLS. RUN adds GRANTs. |
| `RUN_USER_ROLE_RIDER.sql` | **009** | Partial | Role UPDATE overlap. RUN also adds `'rider'` to enum. |

**Cross-RUN duplicate:** `RUN_FIX_KYC_APPROVAL.sql` ⊂ `RUN_ADMIN_PROFILE_STATUS.sql` (owner_profiles portion).

---

## 2. RUN Scripts With No Migration Equivalent

| Script | Purpose | Recommendation |
|--------|---------|----------------|
| `RUN_MAKE_ADMIN.sql` | Promote user to admin by email | Keep as operational runbook script |
| `RUN_RIDER_SIGNUP.sql` | Drop auth triggers, create `rider_profiles`, RLS hotfix | Document as production hotfix; consider formalizing in migration 020 |
| `RUN_USERS_UPDATED_AT.sql` | Optional `users.updated_at` column | Evaluate if app reads this column; migrate or drop script |
| `RUN_VEHICLE_DOCUMENTS_STATUS.sql` | `vehicles.documents_status` + backfill | Used by admin documents UI; candidate for migration 020 |
| `RUN_ADMIN_PROFILE_STATUS.sql` | `customer_profiles.kyc_status/status/approved_at` | Partially unique; consolidate with 017 or new migration |

---

## 3. Migrations With No RUN Script Equivalent

| Migration | Summary | Status |
|-----------|---------|--------|
| **001** | Legacy `vehicle_owners` + route-based `vehicles` | Legacy — superseded by 012 |
| **002** | Full marketplace bootstrap (owners, driver_vehicles, payments) | Experimental — conflicts with 003/004 |
| **003** | Cleaner marketplace bootstrap | Legacy bootstrap |
| **004** | Three-module journey fields | Experimental — schema conflicts with 002/003 |
| **005** | Demo seed data | Dev/test only |
| **006** | OTP, owner_kyc, Razorpay payments, notifications | Partially live; KYC path superseded by 016/RUN |
| **007** | Phase 1 modules (profiles, saved_vehicles, earnings) | Active foundation |
| **008** | Phase 2 trust/growth (wallets, coupons, referrals, SOS) | Active; customer_kyc portion superseded by 018 |
| **009** | Role comment + user→rider UPDATE | Minimal; enum fix only in RUN |
| **010** | Vehicle onboarding columns | Active |
| **011** | Owner signup decoupling + vehicle make/model | Active |

Migrations **012–019** all have corresponding RUN scripts.

---

## 4. Legacy / Experimental Status: Migrations 001–006

| # | Creates | Superseded By | Verdict |
|---|---------|---------------|---------|
| **001** | `vehicle_owners` extensions, route/pricing `vehicles` | 002→003→**012** | **Legacy** — pre-rewrite |
| **002** | Enums, `owners`, marketplace vehicles, driver_vehicles, simple payments | 003, 006, **012** | **Experimental alternate path** |
| **003** | Bootstrap owners/vehicles/self_drive | 004, 006, **012** | **Legacy bootstrap** |
| **004** | Journey fields on driver/self_drive modules | Conflicts with 002/003 | **Experimental / conflicting** |
| **005** | Sample seed data | N/A | **Dev seed only** |
| **006** | auth_otps, owner_kyc, Razorpay payments, notifications | 007+, 016/RUN for KYC | **Partially live** — OTP/payments/notifications may still apply |

**Critical finding:** Three incompatible `public.vehicles` definitions exist across 001, 002/003, and 012. These are **not safely composable** on a fresh database without manual reconciliation.

---

## 5. Duplicate Content Between Migration Files

| Pair | Issue |
|------|-------|
| **002 ↔ 003** | Overlapping enums, owners, vehicles, self_drive_vehicles, booking columns |
| **002 ↔ 004** | Same table names, different column layouts |
| **003 ↔ 004** | Conflicting self_drive_vehicles schemas |
| **002 ↔ 006** | Different `payments` table schemas — first-applied wins |
| **001 ↔ 002/003 ↔ 012** | Three distinct `vehicles` definitions |
| **006 ↔ 008** | customer-kyc bucket (public vs private) |
| **007 ↔ 016 ↔ 017** | Incremental owner_profiles evolution with default conflicts |
| **008 ↔ 018** | customer_kyc schema evolution |
| **012–019 ↔ RUN twins** | Line-for-line duplicates for manual SQL Editor use |

---

## 6. Recommended Consolidation Plan (No Action Taken)

### For fresh Supabase projects
1. Apply **006** (OTP, payments, notifications) if those features are needed.
2. Apply **007–011** for phase-1 foundation.
3. Apply **012–019** as the canonical vehicles/KYC/search path.
4. **Skip 001–005** unless maintaining legacy marketplace data.
5. Run **RUN_RIDER_SIGNUP.sql** and **RUN_MAKE_ADMIN.sql** only as documented operational steps.

### For existing production databases
1. Inventory which migrations were actually applied (Supabase `schema_migrations` table).
2. Do **not** re-run 001–004 or duplicate RUN scripts on live DBs.
3. Prefer migrations 012–019 over RUN twins for new environments.
4. Formalize RUN-only scripts (`documents_status`, `rider_profiles`, `users.updated_at`) into migration **020** when ready.

### Script inventory to retain in runbooks
| Priority | Script |
|----------|--------|
| High | `RUN_OWNER_PROFILE_KYC.sql`, `RUN_ADMIN_PROFILE_STATUS.sql`, `RUN_CUSTOMER_KYC.sql`, `RUN_SELF_DRIVE_KYC.sql` |
| Medium | `RUN_VEHICLES_TABLE.sql`, `RUN_MAKE_ADMIN.sql`, `RUN_RIDER_SIGNUP.sql` |
| Low (superseded by migrations) | `RUN_VEHICLES_SEARCH_COLUMNS.sql`, `RUN_VEHICLE_SERVICE_AVAILABILITY.sql`, `RUN_OWNER_STATUS.sql`, `RUN_FIX_KYC_APPROVAL.sql`, `RUN_NOTIFICATIONS_TABLE.sql`, `RUN_USER_ROLE_RIDER.sql` |

---

## 7. Unused SQL Scripts Assessment

| Script | Used By App Code? | Verdict |
|--------|-------------------|---------|
| All RUN_*.sql | Not imported by TypeScript (manual execution only) | **Operational runbooks** — not "unused" but not auto-applied |
| Migrations 001–004 | Superseded schema paths | **Legacy** — do not apply on new installs |
| Migration 005 | Seed data | **Optional dev-only** |

---

*End of report. No files were modified or deleted.*
