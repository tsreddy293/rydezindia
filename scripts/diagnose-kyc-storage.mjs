/**
 * Read-only KYC storage diagnostic (no uploads).
 * Usage: node scripts/diagnose-kyc-storage.mjs
 */
import { readFileSync } from "node:fs";
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
    /* optional file */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ["customer-kyc", "owner-kyc"];

console.log("=== KYC Storage Diagnostic ===");
console.log("Supabase URL:", url);
console.log("Service key loaded:", Boolean(serviceKey));

for (const bucketId of BUCKETS) {
  console.log("\n--- Bucket:", bucketId, "---");
  const { data, error } = await db.storage.getBucket(bucketId);
  console.log("getBucket:", {
    found: Boolean(data),
    name: data?.name ?? null,
    public: data?.public ?? null,
    error: error
      ? { message: error.message, name: error.name, statusCode: error.statusCode ?? null }
      : null,
  });
}

const { data: buckets, error: listError } = await db.storage.listBuckets();
console.log("\n--- listBuckets ---");
console.log({
  count: buckets?.length ?? 0,
  ids: buckets?.map((b) => b.id) ?? [],
  error: listError
    ? { message: listError.message, name: listError.name, statusCode: listError.statusCode ?? null }
    : null,
});

console.log("\nIf customer-kyc is missing, run: supabase/RUN_KYC_STORAGE_BUCKETS.sql");
