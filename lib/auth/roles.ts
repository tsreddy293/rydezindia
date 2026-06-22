import type { UserRole } from "@/types/database";
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  OWNER_DASHBOARD_PATH,
} from "@/lib/auth/rbac-paths";

/** Normalize DB/metadata role values; `user` is legacy alias for `rider`. */
export function normalizeRole(value: unknown): UserRole | null {
  if (value === "user" || value === "rider") return "rider";
  if (value === "owner") return "owner";
  if (value === "admin") return "admin";
  return null;
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  rider: "/dashboard",
  owner: OWNER_DASHBOARD_PATH,
  admin: ADMIN_HOME_PATH,
};

export const ROLE_LOGIN_PATHS: Record<UserRole, string> = {
  rider: "/login/rider",
  owner: "/login/owner",
  admin: ADMIN_LOGIN_PATH,
};

export const ROLE_SIGNUP_PATHS: Record<Exclude<UserRole, "admin">, string> = {
  rider: "/signup/rider",
  owner: "/signup/owner",
};

export function roleLabel(role: UserRole): string {
  if (role === "rider") return "Rider";
  if (role === "owner") return "Vehicle Owner";
  return "Admin";
}
