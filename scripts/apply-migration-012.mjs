#!/usr/bin/env node
/**
 * Applies migration 012 to create public.vehicles.
 *
 * Set DATABASE_URL in .env.local (Supabase → Settings → Database → URI):
 * postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Then run: npm run db:migrate:vehicles
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

4. Run again: npm run db:migrate:vehicles

Or paste supabase/migrations/012_vehicles_table_integration.sql
into Supabase → SQL Editor → Run.
`);
  process.exit(1);
}

const sqlPath = join(root, "supabase", "RUN_VEHICLES_TABLE.sql");
const fallbackPath = join(root, "supabase", "migrations", "012_vehicles_table_integration.sql");
const sql = readFileSync(existsSync(sqlPath) ? sqlPath : fallbackPath, "utf8");

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected. Applying vehicles table migration...");
  await client.query(sql);
  const check = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicles' ORDER BY ordinal_position"
  );
  console.log("Success! public.vehicles columns:", check.rows.map((r) => r.column_name).join(", "));
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
