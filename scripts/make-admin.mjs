#!/usr/bin/env node
/**
 * Promote admin@rydezindia.com (or ADMIN_EMAIL env) to admin role.
 * Usage: npm run make-admin
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetEmail = (process.env.ADMIN_EMAIL || "admin@rydezindia.com").toLowerCase().trim();

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let targetUser = null;
let page = 1;

while (!targetUser) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }
  targetUser = data.users.find((u) => u.email?.toLowerCase() === targetEmail) ?? null;
  if (targetUser || data.users.length < 200) break;
  page += 1;
}

if (!targetUser) {
  console.error(`No auth user found for ${targetEmail}. Sign up or create the account first.`);
  process.exit(1);
}

const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
  user_metadata: {
    ...targetUser.user_metadata,
    role: "admin",
    name: targetUser.user_metadata?.name || "Admin",
  },
});

if (updateError) {
  console.error("Failed to update auth metadata:", updateError.message);
  process.exit(1);
}

const profile = {
  id: targetUser.id,
  email: targetEmail,
  name: "Admin",
  full_name: "Admin",
  role: "admin",
};

let profileError = (await supabase.from("users").upsert(profile)).error;
if (profileError?.message?.includes("column")) {
  delete profile.full_name;
  profileError = (await supabase.from("users").upsert(profile)).error;
}

if (profileError && !profileError.message.includes("does not exist")) {
  console.warn("users table upsert warning:", profileError.message);
}

console.log("Admin role granted successfully.");
console.log("  Email:", targetEmail);
console.log("  User ID:", targetUser.id);
console.log("  Metadata role:", updated.user?.user_metadata?.role);
console.log("\nLog in at /login/admin with this email.");
