# Final Cleanup Report — Phase 2

**Project:** Rydez India  
**Date:** 2026-06-17  
**Type:** Read-only audit — **no code changes, no deletions**  
**Inputs:** `PHASE1_OPTIMIZATION_AUDIT.md`, full codebase grep/import analysis  
**Deliverables:** This report + `DEPENDENCY_GRAPH.md` + `PROJECT_SIZE_REPORT.md` + `MIGRATION_CONSOLIDATION_REPORT.md`

---

## Executive Summary

Phase 2 verified every Phase 1 cleanup candidate against five gates: static imports, dynamic imports, route references, API references, and middleware references.

| Classification | Count | Est. Recoverable Space |
|----------------|-------|------------------------|
| **SAFE_DELETE_FINAL** | 16 file paths (+ `server/node_modules/` tree) | ~13.5 MB |
| **REVIEW_REQUIRED** | 14 paths / groups | Requires redirects or link updates first |
| **DO_NOT_DELETE** | 8 paths / groups | Active production code |

**Critical correction:** Phase 1 marked the entire `server/` folder for deletion. Phase 2 confirms only the **legacy Express/MongoDB subset** is safe. **`server/actions/` must remain** — it contains all Next.js server actions (`createBooking.ts`, `auth.ts`, `ownerKyc.ts`, etc.).

---

## SAFE_DELETE_FINAL

Files passing all five verification gates (References Found = 0).

### Application Code

| File Path | Reason | References Found |
|-----------|--------|------------------|
| `components/forms/MarketplaceBookingForm.tsx` | Superseded by `UnifiedBookingForm.tsx`; zero inbound imports | **0** |
| `server/actions/kyc.ts` | Deprecated wrapper around `submitOwnerProfileKyc`; zero callers | **0** |

### Legacy Express/MongoDB Server

| File Path | Reason | References Found |
|-----------|--------|------------------|
| `server/index.js` | Standalone Express app on port 5000; Next.js app uses Supabase + `app/api/*` | **0** |
| `server/routes/auth.js` | Legacy MongoDB auth routes | **0** |
| `server/routes/admin.js` | Legacy admin routes | **0** |
| `server/routes/bookings.js` | Legacy booking routes | **0** |
| `server/routes/owners.js` | Legacy owner routes | **0** |
| `server/routes/vehicles.js` | Legacy vehicle routes | **0** |
| `server/models/User.js` | Mongoose model | **0** |
| `server/models/Booking.js` | Mongoose model | **0** |
| `server/models/Vehicle.js` | Mongoose model | **0** |
| `server/middleware/auth.js` | Express JWT middleware | **0** |
| `server/package.json` | Legacy server manifest | **0** |
| `server/package-lock.json` | Legacy lockfile | **0** |
| `server/.env.example` | Legacy env template | **0** |
| `server/node_modules/` | Nested Express/Mongoose install (~13 MB) | **0** |

---

## REVIEW_REQUIRED

Files with zero code imports but **non-zero route, middleware, or operational references**. Do not delete until replacements are in place.

| File Path | Blocking References | Recommended Action Before Delete |
|-----------|--------------------|---------------------------------|
| `app/admin/kyc/page.tsx` | `revalidatePath("/admin/kyc")` in 3 server actions; `ADMIN_PATHS` in `adminManagement.ts` | Add `next.config.ts` redirect OR keep page; update revalidatePath list |
| `app/admin/owners/page.tsx` | `revalidatePath("/admin/owners")` in 2 server actions; `ADMIN_PATHS` | Same as above → `/admin/owner-management` |
| `app/admin/customer-kyc/page.tsx` | `revalidatePath("/admin/customer-kyc")` in `phase2Admin.ts`; `ADMIN_PATHS` | Same as above → `/admin/customer-management` |
| `app/user/login/page.tsx` | `proxy.ts` redirect (lines 88, 128) | Keep `proxy.ts` redirect; page file optional |
| `app/user/register/page.tsx` | `proxy.ts` redirect (lines 89, 129); `sitemap.ts`; `README.md` | Update sitemap + docs; keep proxy redirect |
| `app/user/profile/kyc/page.tsx` | `UserDashboardNav.tsx`; `customerKyc.ts` revalidatePath | Consolidate to `/dashboard/kyc`; update nav |
| `app/user/dashboard/verification/page.tsx` | Active nav link; `customerKyc.ts` revalidatePath; `proxy.ts` | Merge with KYC page or keep as alias |
| `app/privacy/page.tsx` | Metadata path `/privacy`; duplicate of `/privacy-policy` | 301 redirect; Footer already uses canonical |
| `app/contact/page.tsx` + `app/contact/layout.tsx` | `HeaderClient.tsx` links `/contact`; `investors/page.tsx` | Update links to `/contact-us`; add redirect |
| `app/terms/page.tsx` | Duplicate of `/terms-and-conditions` | 301 redirect |
| `app/refund/page.tsx` | Duplicate of `/refund-policy` | 301 redirect |
| `app/login/page.tsx` | Role picker at `/login`; `proxy.ts` authSelectionPaths | Confirm analytics/traffic; may keep |
| `supabase/RUN_*.sql` (15 files) | Operational runbooks, not code imports | Consolidate per migration report; do not auto-delete |
| Root `images/` folder | Duplicate of `public/images/` | Delete after confirming no build step copies from root |
| `screenshots/` folder | Zero code references | Archive externally if needed for design QA |

---

## DO_NOT_DELETE

| File / Group | Reason |
|--------------|--------|
| **`server/actions/*`** (except `kyc.ts`) | Active Next.js server actions — booking, auth, KYC, admin, vehicles |
| **`app/dashboard/page.tsx`** | Canonical `/dashboard` re-export; 15+ route references |
| **`components/vehicles/SearchResultCard.tsx`** | Imported by `app/search/page.tsx`, `SearchPageClient.tsx` |
| **`components/vehicles/MarketplaceResultCard.tsx`** | Imported by `app/search/page.tsx` |
| **`supabase/migrations/*`** | Applied migration history — never delete |
| **`supabase/migrations/001–006`** | Legacy but may be applied in production DBs |
| **`proxy.ts`** | Auth/route protection (admin, owner, rider gates + legacy redirects) |
| **`lib/admin/admin-modules.ts`** | Canonical admin navigation |

---

## Verification Summary

### Checks Performed

| Gate | Method |
|------|--------|
| Static imports | `rg` across all `.ts`, `.tsx`, `.js`, `.mjs` |
| Dynamic imports | `rg 'import\('` excluding `server/node_modules` |
| Route references | `revalidatePath`, `redirect`, `href`, sitemap, robots, proxy.ts |
| API references | Cross-check legacy Express `/api/*` vs Next.js `app/api/*` |
| Middleware references | `proxy.ts` path matching |

### Key Findings

1. **No Next.js code imports the legacy Express server.** OTP auth uses `app/api/auth/send-otp` and `verify-otp`, not `server/routes/auth.js`.

2. **`LEGACY_ADMIN_REDIRECTS` in `admin-modules.ts` is defined but never consumed.** Redirect pages handle admin aliases at the App Router level instead.

3. **Admin alias pages have no TypeScript importers** but remain reachable URLs with active `revalidatePath` targets.

4. **`/search` legacy page is still linked** from dashboard, footer, home, and booking flows — SearchResultCard and MarketplaceResultCard are required.

5. **KYC has three overlapping routes:** `/dashboard/kyc`, `/user/profile/kyc`, `/user/dashboard/verification`. All three are linked from nav or revalidation.

---

## Recommended Deletion Order (When Approved)

### Phase 2A — Zero-risk (SAFE_DELETE_FINAL)

1. `components/forms/MarketplaceBookingForm.tsx`
2. `server/actions/kyc.ts`
3. Legacy Express tree: `server/index.js`, `routes/`, `models/`, `middleware/`, `package.json`, `package-lock.json`, `.env.example`, `node_modules/`

**Verify after:** `npm run build` passes.

### Phase 2B — After redirect/link updates (REVIEW_REQUIRED)

1. Admin alias pages → add `next.config.ts` redirects first
2. Legal duplicates → 301 + update Header/investors links
3. KYC alias pages → merge nav to single `/dashboard/kyc`
4. Root `images/` + `screenshots/` → asset cleanup
5. Remove unused npm packages (Radix suite, recharts, cva)

### Phase 2C — Never

- `server/actions/` (except deprecated `kyc.ts`)
- Applied Supabase migrations
- Active search result components

---

## Related Reports

| Report | Contents |
|--------|----------|
| [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md) | Per-file dependency trees, Mermaid graph, verification matrix |
| [PROJECT_SIZE_REPORT.md](./PROJECT_SIZE_REPORT.md) | Folder/file sizes, unused deps, duplicate assets |
| [MIGRATION_CONSOLIDATION_REPORT.md](./MIGRATION_CONSOLIDATION_REPORT.md) | SQL migration duplicates, RUN script mapping, 001–006 legacy status |
| [PHASE1_OPTIMIZATION_AUDIT.md](./PHASE1_OPTIMIZATION_AUDIT.md) | Original cleanup candidate list |

---

## Sign-Off

| Item | Status |
|------|--------|
| Dependency graphs generated | ✅ |
| Five-gate verification complete | ✅ |
| SAFE / REVIEW / DO NOT DELETE classification | ✅ |
| Supabase migration audit | ✅ |
| Project size audit | ✅ |
| Code changes | ❌ None |
| File deletions | ❌ None |

*End of Phase 2 Cleanup Audit.*
