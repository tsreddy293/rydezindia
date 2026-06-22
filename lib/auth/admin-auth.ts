import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeRole, ROLE_LOGIN_PATHS } from "@/lib/auth/roles";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import {
  ADMIN_LOGIN_PATH,
  redirectPathForWrongAdminAccess,
} from "@/lib/auth/rbac-paths";
import { createClient } from "@/lib/supabase/server";

/**
 * Server guard for all /admin routes.
 * Verifies session + role=admin; never allows query-string bypass.
 */
export async function requireAdmin(): Promise<{ user: User; role: "admin" }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect(ADMIN_LOGIN_PATH);
  }

  const currentRole =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";

  if (currentRole !== "admin") {
    redirect(redirectPathForWrongAdminAccess(currentRole));
  }

  return { user: data.user, role: "admin" };
}

/** Used when a non-admin session hits an admin-only server action. */
export async function assertAdminSession(): Promise<{ userId: string }> {
  const { user } = await requireAdmin();
  return { userId: user.id };
}

export { ADMIN_LOGIN_PATH, ROLE_LOGIN_PATHS };
