# KYC Upload Debug Report

**Date:** 2026-06-17  
**Route:** `/dashboard/kyc`  
**Symptom:** *"Document storage is temporarily unavailable. Please try again later."*  
**Supabase project:** `ogfvhlqttdxfiebrpvii.supabase.co`

---

## Executive Summary

| Item | Result |
|------|--------|
| **Root cause** | Storage bucket **`customer-kyc` does not exist** in Supabase (HTTP 404) |
| **Failure point** | Bucket lookup in `ensureKycBucketExists()` — before upload |
| **Auth session** | OK — rider reaches page via `requireRole("user")` |
| **RLS / policies** | Not reached — upload never attempted |
| **Environment variables** | OK — URL + service role key loaded |
| **Fix** | Run `supabase/RUN_KYC_STORAGE_BUCKETS.sql` in Supabase SQL Editor |

---

## 1. Upload Flow Trace (`/dashboard/kyc`)

```
Browser: /dashboard/kyc
  └─ app/dashboard/kyc/page.tsx
       ├─ requireRole("user", returnPath)          → auth OK (rider session)
       ├─ getCustomerKycStatus(userId)             → DB read OK
       └─ RiderKycUploadForm (client)
            ├─ validateKycUploadFile()               → size/type check
            ├─ prepareKycFileForUpload()            → image compression
            └─ submitCustomerKyc(formData)          → server action
                 ├─ requireRole("user")             → auth user id
                 ├─ uploadIfPresent() × 4 files
                 │    └─ uploadCustomerKycFile()
                 │         └─ lib/kyc/kyc-storage.ts
                 │              ├─ ensureKycBucketExists("customer-kyc")  ← FAILS HERE
                 │              └─ storage.upload()  (never reached)
                 └─ upsertCustomerKyc()             (never reached)
```

---

## 2. Failure Point Analysis

### Bucket lookup — **CONFIRMED FAILURE**

Diagnostic script output (`node scripts/diagnose-kyc-storage.mjs`):

```json
{
  "bucket": "customer-kyc",
  "getBucket": {
    "found": false,
    "error": {
      "message": "Bucket not found",
      "name": "StorageApiError",
      "statusCode": "404"
    }
  }
}
```

```json
{
  "listBuckets": {
    "count": 2,
    "ids": ["vehicle-assets", "owner-kyc"]
  }
}
```

**`customer-kyc` is not in the project.** Only `vehicle-assets` and `owner-kyc` exist.

Code path (`lib/kyc/kyc-storage.ts`):

1. `getBucket("customer-kyc")` → 404 *Bucket not found*
2. `listBuckets()` → does not include `customer-kyc`
3. `ensureKycBucketExists()` throws `KYC_STORAGE_UNAVAILABLE`
4. User sees friendly message (not raw Supabase error)

### Storage upload — **NOT REACHED**

Upload API is never called because pre-check fails first.

### Auth session — **OK**

| Step | Component | Status |
|------|-----------|--------|
| Page load | `requireRole("user", returnPath)` | Passes if rider logged in |
| Submit | `submitCustomerKyc` → `requireRole("user")` | Uses `user.id` for paths |
| Upload auth | `createAdminClient()` service role | Bypasses user JWT for storage |

Uploads are **server-side with service role**, not rider JWT. Rider session is only used to obtain `userId`.

### RLS policies — **NOT THE ISSUE (for server upload)**

Policies in `RUN_KYC_STORAGE_BUCKETS.sql`:

| Bucket | Policy | Role |
|--------|--------|------|
| `customer-kyc` | Service role manages customer kyc storage | `service_role` ALL |
| `customer-kyc` | Public read customer kyc | SELECT public |

**Authenticated rider direct upload is not used** — `uploadCustomerKycFile` uses `SUPABASE_SERVICE_ROLE_KEY`. Once the bucket exists, service role policy is sufficient.

### Environment variables — **OK**

| Variable | Loaded |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (`https://ogfvhlqttdxfiebrpvii.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |

---

## 3. Expected vs Actual Storage Config

| Bucket | Expected | Actual in Supabase |
|--------|----------|-------------------|
| `customer-kyc` | Rider self-drive KYC | **Missing** |
| `owner-kyc` | Owner KYC | **Exists** (public) |
| `vehicle-assets` | Vehicle files | Exists |

---

## 4. Upload Path Format (when bucket exists)

| Field | Storage key | Example path |
|-------|-------------|--------------|
| Aadhaar Front | `aadhaar-front` | `{userId}/aadhaar-front-{timestamp}.jpg` |
| Aadhaar Back | `aadhaar-back` | `{userId}/aadhaar-back-{timestamp}.jpg` |
| Driving License | `driving-license` | `{userId}/driving-license-{timestamp}.pdf` |
| Selfie | `selfie` | `{userId}/selfie-{timestamp}.jpg` |

**Bucket name:** `customer-kyc`

---

## 5. Server Logs Added

After this investigation, the following logs appear in the **dev server terminal** during upload:

| Log prefix | Data logged |
|------------|-------------|
| `[submitCustomerKyc] start` | `userId`, bucket name, field list |
| `[submitCustomerKyc] uploading file` | `userId`, form field, storage key, file name/size/type |
| `[kyc-storage] getBucket` | bucket id, found flag, error code/message |
| `[kyc-storage] listBuckets` | bucket ids, count, error |
| `[kyc-storage] upload start` | bucket, path, userId, file metadata |
| `[kyc-storage] upload response` | success, path, Supabase error details |
| `[submitCustomerKyc] failed` | raw error + stack |

---

## 6. Fix

### Immediate (required)

1. Open **Supabase Dashboard → SQL Editor**
2. Run entire file: **`supabase/RUN_KYC_STORAGE_BUCKETS.sql`**
3. Verify **Storage → Buckets** shows `customer-kyc` (public)
4. Retry upload at `/dashboard/kyc`

### Verify locally

```bash
node scripts/diagnose-kyc-storage.mjs
```

Expected after fix:

```
getBucket customer-kyc: { found: true, name: 'customer-kyc', public: true }
listBuckets ids: [ 'vehicle-assets', 'owner-kyc', 'customer-kyc' ]
```

### Code improvements applied

| Change | Purpose |
|--------|---------|
| `scripts/diagnose-kyc-storage.mjs` | Read-only bucket probe for ops |
| Enhanced `lib/kyc/kyc-storage.ts` logging | Logs bucket name, path, Supabase error codes |
| Smarter bucket probe | `listBuckets` API failure no longer falsely marks bucket missing |
| `submitCustomerKyc` structured logs | Logs auth user id per file upload |

---

## 7. File Limits (unchanged, working)

| Document | Max | Types |
|----------|-----|-------|
| Aadhaar Front / Back | 500 KB | JPG, JPEG, PNG, PDF |
| Driving License | 500 KB | JPG, JPEG, PNG, PDF |
| Selfie | 300 KB | JPG, JPEG, PNG |

Compression: client-side via `prepareKycFileForUpload()` before server action.

---

## 8. Conclusion

| Question | Answer |
|----------|--------|
| Bucket name | `customer-kyc` |
| Upload path | `{userId}/{key}-{timestamp}.{ext}` |
| Auth user id | From `requireRole("user")` — session OK |
| Storage response | **404 Bucket not found** on `getBucket` |
| Root cause | Bucket never created in Supabase project |
| Fix | Run `RUN_KYC_STORAGE_BUCKETS.sql` |

Owner KYC (`owner-kyc`) would work today; rider self-drive KYC cannot until `customer-kyc` is created.

---

*End of report.*
