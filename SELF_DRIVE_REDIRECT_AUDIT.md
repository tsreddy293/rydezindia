# Self-Drive Redirect Audit

**Date:** 2026-06-17  
**Issue:** Self-drive KYC flow redirected customers to `/admin` instead of `/dashboard/kyc`  
**Build verification:** `npm run build` — passed

---

## Root Cause

When a **non-rider session** (especially `admin`) was active on the self-drive booking page:

1. `getOptionalRiderUser()` returned `null`, so the UI showed the guest KYC gate.
2. **Upload KYC Documents** linked directly to `/dashboard/kyc?reason=self_drive&...`.
3. `proxy.ts` treats `/dashboard/*` as rider-only; for `role === "admin"` it redirects to **`/admin`**.

There was **no customer-side href to `/admin`**. The wrong destination came from **middleware role gating**, not a bad link.

---

## Changes Made

| File | Old Behavior | New Behavior | Verification |
|------|--------------|--------------|--------------|
| `lib/kyc/self-drive-nav.ts` | *(new)* | Central KYC/login URL helpers; blocks `/admin` in post-login redirects | ✅ No admin URLs |
| `components/booking/SelfDriveKycUploadButton.tsx` | *(new)* | Client button: rider → `/dashboard/kyc`; guest → `/login/rider?redirect=...` | ✅ Auth-aware |
| `components/booking/SelfDriveKycGate.tsx` | Static `href={kycHref}` to `/dashboard/kyc` for all users | Uses `SelfDriveKycUploadButton` + `isRiderLoggedIn` prop; login link uses `redirect` param | ✅ Fixed |
| `app/booking/[id]/page.tsx` | No rider vs other-role distinction on gate | Passes `isRiderLoggedIn`; warns non-rider sessions | ✅ Fixed |
| `server/actions/auth.ts` | Post-login always `ROLE_REDIRECTS[role]` | Honors safe `redirect` form field for riders; `getOptionalAuthSession()` added; `requireRole` accepts return path | ✅ Fixed |
| `components/auth/RoleLoginForm.tsx` | No redirect passthrough | Hidden `redirect` field when provided | ✅ Fixed |
| `app/login/rider/page.tsx` | No `redirect` query support | Reads `?redirect=` and passes to login form | ✅ Fixed |
| `app/dashboard/kyc/page.tsx` | `requireRole("user")` → bare `/login/rider` | `requireRole("user", returnPath)` preserves KYC URL after login | ✅ Fixed |
| `proxy.ts` | Unauthenticated rider routes → `/login/rider` | → `/login/rider?redirect=<original-path>` | ✅ Fixed |
| `lib/kyc/self-drive-gate.ts` | Local `selfDriveKycRedirectPath` | Re-exports from `self-drive-nav.ts` | ✅ Unchanged URLs |

---

## Project-Wide Search Results

| Pattern | Customer-Side Matches | Action |
|---------|------------------------|--------|
| `reason=self_drive` | `lib/kyc/self-drive-nav.ts`, `app/dashboard/kyc/page.tsx` (display only) | ✅ All point to `/dashboard/kyc` |
| `/admin?` | None in customer components | ✅ None |
| `href="/admin"` | `components/admin/AdminTable.tsx` only | ✅ Admin-only — not modified |
| `router.push('/admin')` | None | ✅ None |
| `window.location.href='/admin'` | None | ✅ None |

---

## Expected Flows (After Fix)

### Rider logged in, KYC not submitted

```
Search Self Drive → Book Now → KYC Gate → Upload KYC Documents
  → /dashboard/kyc?reason=self_drive&return=/booking/{id}?type=self_drive
```

### Guest (not logged in)

```
Search Self Drive → Book Now → KYC Gate → Upload KYC Documents
  → /login/rider?redirect=%2Fdashboard%2Fkyc%3Freason%3Dself_drive%26return%3D...
  → (after login) → /dashboard/kyc?reason=self_drive&return=...
```

### Admin/owner logged in (testing or wrong account)

```
Search Self Drive → Book Now → KYC Gate (warning shown)
  → Upload KYC Documents
  → /login/rider?redirect=%2Fdashboard%2Fkyc%3F...   (NOT /dashboard/kyc → /admin)
```

---

## Files Unchanged (Already Correct)

| File | Redirect | Verification |
|------|----------|--------------|
| `app/user/dashboard/page.tsx` | `href="/dashboard/kyc"` | ✅ Customer KYC |
| `lib/services/verification.ts` | Messages reference `/dashboard/kyc` | ✅ Text only |
| `components/dashboard/UserDashboardNav.tsx` | `/dashboard/kyc` nav link | ✅ Customer nav |

---

## Admin Functionality

No admin routes, actions, or `revalidatePath("/admin/*")` calls were modified. Admin dashboard, owner-management, and customer-management flows are unchanged.

---

*End of audit.*
