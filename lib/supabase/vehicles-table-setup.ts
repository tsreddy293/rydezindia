import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export async function isVehiclesTableReady(): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { error } = await db.from("vehicles").select("id").limit(1);
    if (!error) return true;
    const msg = error.message.toLowerCase();
    return !msg.includes("could not find the table") && !msg.includes("does not exist");
  } catch {
    return false;
  }
}

export function getVehiclesMigrationSql(): string {
  const runPath = join(process.cwd(), "supabase", "RUN_VEHICLES_TABLE.sql");
  const migrationPath = join(process.cwd(), "supabase", "migrations", "012_vehicles_table_integration.sql");
  const path = existsSync(runPath) ? runPath : migrationPath;
  return readFileSync(path, "utf8");
}

export function getSupabaseDashboardUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return "https://supabase.com/dashboard";
  return `https://supabase.com/dashboard/project/${match[1]}`;
}
