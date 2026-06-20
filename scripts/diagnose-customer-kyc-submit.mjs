#!/usr/bin/env node
/**
 * End-to-end KYC submit diagnostics (storage + database, no browser session).
 * Usage: node scripts/diagnose-customer-kyc-submit.mjs [optional-user-id]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(name) {
  try {
    const text = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const i = trimmed.indexOf("=");
      if (i === -1) continue;
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testUserId = process.argv[2] ?? "00000000-0000-4000-8000-000000000001";

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "customer-kyc";
const report = {
  generatedAt: new Date().toISOString(),
  supabaseUrl: url,
  testUserId,
  checks: {},
  simulatedSubmit: {},
  rootCause: null,
  requiredFix: null,
};

function pass(name, detail) {
  report.checks[name] = { ok: true, ...detail };
  console.log(`✓ ${name}`, detail?.message ?? "");
}

function fail(name, detail) {
  report.checks[name] = { ok: false, ...detail };
  console.error(`✗ ${name}`, detail);
}

console.log("=== Customer KYC Submit Diagnostic ===\n");
console.log("Supabase URL:", url);
console.log("Test user ID:", testUserId, "(synthetic unless you pass a real UUID)\n");

// 1. Bucket
const { data: bucket, error: bucketError } = await db.storage.getBucket(BUCKET);
if (bucket && !bucketError) {
  pass("customer_kyc_bucket", {
    message: `Bucket '${BUCKET}' exists (public: ${bucket.public})`,
    bucketId: BUCKET,
    public: bucket.public,
  });
} else {
  fail("customer_kyc_bucket", {
    message: bucketError?.message ?? "Bucket not found",
    code: bucketError?.name ?? null,
  });
}

// 2. Table + status column
const { data: tableProbe, error: tableError } = await db
  .from("customer_kyc")
  .select("id, user_id, status, submitted_at, aadhaar_front_url")
  .limit(1);

if (tableError) {
  fail("customer_kyc_table", {
    message: tableError.message,
    code: tableError.code,
    hint: tableError.hint ?? null,
  });
  report.rootCause = {
    phase: "database",
    functionName: "customer_kyc.select",
    failedFile: null,
    supabaseResponse: {
      code: tableError.code,
      message: tableError.message,
      hint: tableError.hint,
    },
  };
  report.requiredFix =
    "Run supabase/RUN_CREATE_CUSTOMER_KYC.sql in Supabase SQL Editor (or npm run db:setup:customer-kyc with DATABASE_URL).";
} else {
  pass("customer_kyc_table", {
    message: "Table public.customer_kyc exists",
    sampleRowCount: tableProbe?.length ?? 0,
  });
  pass("customer_kyc_status_column", {
    message: "Column 'status' readable via PostgREST",
  });
}

// 3. Storage upload test (tiny PNG)
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const pngBytes = Buffer.from(pngBase64, "base64");
const testPath = `${testUserId}/diagnostic-${Date.now()}.png`;

let uploadUrl = null;
if (bucket && !bucketError) {
  const blob = new Blob([pngBytes], { type: "image/png" });
  const { data: uploadData, error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(testPath, blob, { upsert: true, contentType: "image/png" });

  if (uploadError) {
    fail("storage_upload_test", {
      message: uploadError.message,
      name: uploadError.name,
      statusCode: uploadError.statusCode ?? null,
      path: testPath,
    });
    if (!report.rootCause) {
      report.rootCause = {
        phase: "storage",
        functionName: "uploadKycDocument",
        failedFile: testPath,
        supabaseResponse: {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: uploadError.statusCode ?? null,
        },
      };
      report.requiredFix =
        "Fix storage: ensure customer-kyc bucket exists and service_role can upload (RUN_KYC_STORAGE_BUCKETS.sql).";
    }
  } else {
    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(testPath);
    uploadUrl = pub.publicUrl;
    pass("storage_upload_test", {
      message: "Service-role upload succeeded",
      path: uploadData?.path ?? testPath,
      publicUrl: uploadUrl,
    });
    await db.storage.from(BUCKET).remove([testPath]);
  }
}

// 4. Database upsert test (only if table exists)
if (!tableError && uploadUrl) {
  const now = new Date().toISOString();
  const payload = {
    user_id: testUserId,
    aadhaar_front_url: uploadUrl,
    aadhaar_back_url: uploadUrl,
    driving_license_url: uploadUrl,
    selfie_url: uploadUrl,
    status: "pending",
    submitted_at: now,
    updated_at: now,
  };

  let { data: upsertData, error: upsertError } = await db
    .from("customer_kyc")
    .upsert(payload, { onConflict: "user_id" })
    .select("id, user_id, status")
    .single();

  if (
    upsertError &&
    (upsertError.code === "42P10" || upsertError.message.includes("ON CONFLICT"))
  ) {
    const { data: existing } = await db.from("customer_kyc").select("id").eq("user_id", testUserId).maybeSingle();
    if (existing) {
      ({ data: upsertData, error: upsertError } = await db
        .from("customer_kyc")
        .update(payload)
        .eq("user_id", testUserId)
        .select("id, user_id, status")
        .single());
    } else {
      ({ data: upsertData, error: upsertError } = await db
        .from("customer_kyc")
        .insert(payload)
        .select("id, user_id, status")
        .single());
    }
  }

  if (upsertError) {
    fail("database_upsert_test", {
      message: upsertError.message,
      code: upsertError.code,
      hint: upsertError.hint ?? null,
    });
    report.simulatedSubmit = { ok: false, step: "upsertCustomerKyc", error: upsertError };
    if (!report.rootCause) {
      report.rootCause = {
        phase: "database",
        functionName: "upsertCustomerKyc",
        failedFile: null,
        supabaseResponse: {
          code: upsertError.code,
          message: upsertError.message,
          hint: upsertError.hint,
        },
      };
      report.requiredFix = "Run supabase/RUN_FIX_CUSTOMER_KYC_UNIQUE.sql to add UNIQUE(user_id), or rely on insert/update fallback in app code.";
    }
  } else {
    pass("database_upsert_test", {
      message: "Upsert succeeded (test row written)",
      row: upsertData,
    });
    report.simulatedSubmit = { ok: true, step: "upsertCustomerKyc", row: upsertData };
    await db.from("customer_kyc").delete().eq("user_id", testUserId);
    console.log("  (test row cleaned up)");
  }
} else if (!tableError) {
  report.simulatedSubmit = { ok: false, step: "storage_upload_test", skippedDb: true };
}

// 5. Auth note
report.checks.auth_session = {
  ok: null,
  message:
    "Browser auth not tested here. submitCustomerKyc uses requireRole('user') → rider session via cookies.",
};

console.log("\n=== Summary ===");
if (report.rootCause) {
  console.error("ROOT CAUSE:", JSON.stringify(report.rootCause, null, 2));
  console.error("FIX:", report.requiredFix);
} else {
  console.log("All automated checks passed. If submit still fails, check server logs for auth or validation.");
  report.rootCause = null;
  report.requiredFix = "None — infrastructure OK; inspect runtime auth/validation in dev server logs.";
}

const outPath = resolve(process.cwd(), "KYC_SUBMIT_ROOT_CAUSE.md");
const md = buildMarkdownReport(report);
writeFileSync(outPath, md, "utf8");
console.log("\nReport written:", outPath);

function buildMarkdownReport(r) {
  const checks = Object.entries(r.checks)
    .map(([k, v]) => `- **${k}**: ${v.ok === true ? "PASS" : v.ok === false ? "FAIL" : "N/A"} — ${v.message ?? JSON.stringify(v)}`)
    .join("\n");

  const rc = r.rootCause
    ? `
## Root Cause

| Field | Value |
|-------|-------|
| **Phase** | ${r.rootCause.phase} |
| **Failed function** | \`${r.rootCause.functionName}\` |
| **Failed file** | ${r.rootCause.failedFile ?? "N/A (failure after upload or at DB layer)"} |
| **Supabase code** | ${r.rootCause.supabaseResponse?.code ?? "—"} |
| **Supabase message** | ${r.rootCause.supabaseResponse?.message ?? "—"} |
| **Hint** | ${r.rootCause.supabaseResponse?.hint ?? "—"} |

\`\`\`json
${JSON.stringify(r.rootCause.supabaseResponse, null, 2)}
\`\`\`
`
    : "## Root Cause\n\nNo infrastructure failure detected in automated checks.\n";

  return `# KYC Submit Root Cause Analysis

Generated: ${r.generatedAt}  
Supabase: ${r.supabaseUrl}  
Test user: \`${r.testUserId}\`

## Submit Flow (code path)

\`\`\`
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
\`\`\`

## Verification Results

${checks}

## Simulated Submit

\`\`\`json
${JSON.stringify(r.simulatedSubmit, null, 2)}
\`\`\`

${rc}

## Required Fix

${r.requiredFix ?? "See root cause above."}

## Development Mode Errors

After code update, \`NODE_ENV=development\` shows labeled errors on the KYC form:

- \`Storage Error: ...\`
- \`Database Error: ...\`
- \`Auth Error: ...\`

Production continues to show user-friendly messages.

## Manual Steps (if table missing)

1. [Supabase SQL Editor](https://supabase.com/dashboard/project/ogfvhlqttdxfiebrpvii/sql/new)
2. Run \`supabase/RUN_CUSTOMER_KYC.sql\`
3. Re-run: \`node scripts/diagnose-customer-kyc-submit.mjs\`
`;
}

process.exit(report.rootCause ? 1 : 0);
