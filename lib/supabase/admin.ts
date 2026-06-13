import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceKey, getSupabaseUrl, logSupabaseConfig } from "@/lib/supabase/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminClient: SupabaseClient<any> | null = null;

/** Service-role client — server-side only, bypasses RLS */
export function createAdminClient(): SupabaseClient<any> {
  logSupabaseConfig("admin");

  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return adminClient;
}

/** Verify Supabase connection (server-side health check) */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const client = createAdminClient();
    const { error } = await client.from("users").select("id", { count: "exact", head: true });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Connected to Supabase successfully" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { ok: false, message };
  }
}
