import type { UserRole } from "@/types/database";

/** Normalize DB/metadata role values; `user` is legacy alias for `rider`. */
export function normalizeRole(value: unknown): UserRole | null {
  if (value === "user" || value === "rider") return "rider";
  if (value === "owner") return "owner";
  if (value === "admin") return "admin";
  return null;
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  rider: "/dashboard",
  owner: "/owner/dashboard",
  admin: "/admin",
};

export const ROLE_LOGIN_PATHS: Record<UserRole, string> = {
  rider: "/login/rider",
  owner: "/login/owner",
  admin: "/login/admin",
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
