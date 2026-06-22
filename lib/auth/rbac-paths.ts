import type { UserRole } from "@/types/database";

/** Canonical paths for role-based redirects (see security RBAC spec). */
export const ADMIN_LOGIN_PATH = "/admin-login";
export const ADMIN_HOME_PATH = "/admin";
export const OWNER_DASHBOARD_PATH = "/owner-dashboard";
export const CUSTOMER_HOME_PATH = "/";

/** Internal owner dashboard (content lives here; /owner-dashboard is the entry alias). */
export const OWNER_DASHBOARD_INTERNAL_PATH = "/owner/dashboard";

export function isProtectedAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
}

export function isAdminLoginPath(pathname: string): boolean {
  return (
    pathname === ADMIN_LOGIN_PATH ||
    pathname === "/login/admin" ||
    pathname === "/admin/login"
  );
}

/** Blocks /admin URLs in customer/owner post-login redirects. */
export function isBlockedCustomerRedirect(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return true;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return true;
  if (trimmed === ADMIN_HOME_PATH || trimmed.startsWith(`${ADMIN_HOME_PATH}/`)) return true;
  return false;
}

export function redirectPathForWrongAdminAccess(role: UserRole | null): string {
  if (role === "rider") return CUSTOMER_HOME_PATH;
  if (role === "owner") return OWNER_DASHBOARD_PATH;
  return ADMIN_LOGIN_PATH;
}
