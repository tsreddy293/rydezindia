#!/usr/bin/env node
/** Probe live Supabase schema for KYC-related tables/columns. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(name) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), name), "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      if (!process.env[k]) process.env[k] = t.slice(i + 1).trim();
    }
  } catch {}
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const TABLES = [
  "customer_profiles",
  "customer_kyc",
  "owner_profiles",
  "vehicles",
  "bookings",
  "auth_otps",
];

const KYC_COLUMNS = [
  "kyc_status",
  "status",
  "aadhaar_front_url",
  "aadhaar_back_url",
  "driving_license_url",
  "selfie_url",
  "submitted_at",
  "approved_at",
  "reviewed_by",
  "reviewed_at",
  "self_drive_interest",
];

async function probeTable(table) {
  const { data, error } = await db.from(table).select("*").limit(1);
  if (error) {
    return { exists: false, error: { code: error.code, message: error.message, hint: error.hint } };
  }
  const columns = data?.[0] ? Object.keys(data[0]) : [];
  return { exists: true, rowCount: data?.length ?? 0, columnsFromSample: columns };
}

async function probeColumns(table, columns) {
  const select = columns.join(", ");
  const { error } = await db.from(table).select(select).limit(0);
  if (error) {
    const missing = [];
    const present = [];
    for (const col of columns) {
      const { error: colErr } = await db.from(table).select(col).limit(0);
      if (colErr) missing.push({ col, message: colErr.message });
      else present.push(col);
    }
    return { allOk: false, present, missing, selectError: error.message };
  }
  return { allOk: true, present: columns, missing: [] };
}

console.log("=== Supabase Schema Probe ===\n");
console.log("URL:", url, "\n");

const results = {};
for (const table of TABLES) {
  results[table] = await probeTable(table);
  const r = results[table];
  if (r.exists) {
    console.log(`✓ ${table} EXISTS`);
    if (r.columnsFromSample.length) {
      console.log("  sample columns:", r.columnsFromSample.join(", "));
    } else {
      console.log("  (empty table — probing column list)");
      const colProbe = await probeColumns(table, KYC_COLUMNS);
      console.log("  kyc columns present:", colProbe.present.join(", ") || "(none)");
      if (colProbe.missing.length) {
        console.log("  kyc columns missing:", colProbe.missing.map((m) => m.col).join(", "));
      }
      results[table].kycColumnProbe = colProbe;
    }
  } else {
    console.log(`✗ ${table} MISSING — ${r.error?.code}: ${r.error?.message}`);
  }
  console.log("");
}

if (results.customer_profiles?.exists) {
  const cp = await probeColumns("customer_profiles", KYC_COLUMNS);
  results.customer_profiles.kycColumnProbe = cp;
  console.log("--- customer_profiles KYC column detail ---");
  console.log("Present:", cp.present.join(", ") || "(none)");
  console.log("Missing:", cp.missing.map((m) => m.col).join(", ") || "(none)");
}

console.log("\n--- JSON ---");
console.log(JSON.stringify(results, null, 2));
