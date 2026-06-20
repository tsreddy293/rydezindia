import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";

/** Authoritative role from `users.role` (service role — bypasses RLS). */
export async function getRoleForUser(userId: string): Promise<UserRole | null> {
  const db = createAdminClient();
  const { data } = await db.from("users").select("role").eq("id", userId).maybeSingle();
  return normalizeRole((data as { role?: unknown } | null)?.role);
}

/** DB role wins over auth metadata; defaults to rider. */
export async function resolveAuthenticatedUserRole(
  userId: string,
  metadataRole: unknown
): Promise<UserRole> {
  return (await getRoleForUser(userId)) ?? normalizeRole(metadataRole) ?? "rider";
}
