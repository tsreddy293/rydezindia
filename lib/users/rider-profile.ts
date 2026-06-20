import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserName } from "@/lib/users/display-name";

export async function getRiderDisplayName(userId: string, fallback = "Rider"): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("users").select("name, full_name").eq("id", userId).maybeSingle();
    return resolveUserName(data as { name?: string; full_name?: string } | null, fallback);
  } catch {
    return fallback;
  }
}
