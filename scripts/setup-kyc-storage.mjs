/**
 * Creates missing KYC storage buckets via Supabase Storage API (service role).
 * Usage: node scripts/setup-kyc-storage.mjs
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
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = [
  { id: "customer-kyc", public: true },
  { id: "owner-kyc", public: true },
];

console.log("=== Setup KYC Storage Buckets ===\n");

for (const { id, public: isPublic } of BUCKETS) {
  const { data: existing } = await db.storage.getBucket(id);
  if (existing) {
    console.log(`✓ ${id} already exists (public: ${existing.public})`);
    continue;
  }

  const { data, error } = await db.storage.createBucket(id, {
    public: isPublic,
    fileSizeLimit: 524288, // 512 KB — matches KYC max upload
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ],
  });

  if (error) {
    console.error(`✗ Failed to create ${id}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`✓ Created ${id}`, data ?? "(ok)");
  }
}

console.log("\n--- Verification ---");
const { data: buckets } = await db.storage.listBuckets();
console.log("Buckets:", buckets?.map((b) => b.id).join(", ") ?? "none");
console.log(
  "\nNote: Storage RLS policies still require supabase/RUN_KYC_STORAGE_BUCKETS.sql in SQL Editor if uploads fail after bucket creation."
);
