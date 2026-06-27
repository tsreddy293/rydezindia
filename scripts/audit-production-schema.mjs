import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  "bookings",
  "vehicles",
  "users",
  "owner_profiles",
  "payments",
  "refunds",
  "return_journeys",
  "driver_vehicles",
  "self_drive_vehicles",
  "customer_kyc",
  "owner_kyc",
  "notifications",
  "owner_earnings",
  "cancellation_logs",
  "booking_activity_logs",
  "saved_vehicles",
  "wallets",
];

const result = {};

for (const table of tables) {
  const { data, error } = await db.from(table).select("*").limit(1);
  if (error) {
    result[table] = { error: error.message };
    continue;
  }
  const row = data?.[0];
  result[table] = row ? Object.keys(row).sort() : [];
}

console.log(JSON.stringify(result, null, 2));
