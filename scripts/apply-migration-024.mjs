#!/usr/bin/env node
/**
 * Applies migration 024 — bookings cancellation columns.
 *
 * Set DATABASE_URL in .env.local (Supabase → Settings → Database → URI), then:
 *   npm run db:migrate:cancellation
 *
 * Or paste supabase/migrations/024_bookings_cancellation_columns.sql into
 * Supabase → SQL Editor → Run.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!databaseUrl) {
  console.error(`
Missing DATABASE_URL.

1. Open Supabase Dashboard → Project Settings → Database
2. Copy the "URI" connection string (Session pooler or Direct)
3. Add to .env.local:

   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...

4. Run again: npm run db:migrate:cancellation

Or paste supabase/migrations/024_bookings_cancellation_columns.sql
into Supabase → SQL Editor → Run.
`);
  process.exit(1);
}

const sqlPath = join(root, "supabase", "migrations", "024_bookings_cancellation_columns.sql");
const sql = readFileSync(sqlPath, "utf8");

const CANCELLATION_COLUMNS = [
  "cancellation_reason",
  "cancelled_at",
  "cancelled_by",
  "cancellation_charges",
  "refund_amount",
  "refund_status",
];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying bookings cancellation columns migration...");
  await client.query(sql);
  const check = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bookings'
       AND column_name = ANY($1::text[])
     ORDER BY column_name`,
    [CANCELLATION_COLUMNS]
  );
  console.log(
    "Success! Cancellation columns present:",
    check.rows.map((r) => r.column_name).join(", ")
  );
  console.log("PostgREST schema reload notified (NOTIFY pgrst).");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
