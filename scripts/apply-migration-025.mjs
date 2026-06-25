#!/usr/bin/env node
/**
 * Applies migration 025 — bookings.cancelled_by_role column.
 *
 * Set DATABASE_URL in .env.local, then:
 *   npm run db:migrate:cancelled-by-role
 *
 * Or paste supabase/migrations/025_bookings_cancelled_by_role.sql into
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

Paste supabase/migrations/025_bookings_cancelled_by_role.sql
into Supabase → SQL Editor → Run.
`);
  process.exit(1);
}

const sqlPath = join(root, "supabase", "migrations", "025_bookings_cancelled_by_role.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying cancelled_by_role migration...");
  await client.query(sql);
  const check = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'bookings'
       AND column_name IN ('cancelled_by', 'cancelled_by_role')
     ORDER BY column_name`
  );
  console.log("Columns:", check.rows);
  console.log("PostgREST schema reload notified.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
