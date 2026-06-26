import { isBlockedCustomerRedirect } from "@/lib/auth/rbac-paths";

const ALLOWED_LOGIN_PREFIXES = [
  "/login",
  "/admin-login",
  "/forgot-password",
  "/reset-password",
  "/owner/forgot-password",
] as const;

/** Reject external URLs and blocked paths for form-controlled redirects. */
export function safeInternalPath(
  value: string | null | undefined,
  fallback: string
): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.includes("://")) return fallback;
  if (!trimmed.startsWith("/")) return fallback;
  if (isBlockedCustomerRedirect(trimmed)) return fallback;
  return trimmed;
}

/** Safe post-login redirect for owner flows (blocks /admin and external URLs). */
export function safeOwnerRedirectPath(value: string | null | undefined): string | null {
  if (isBlockedCustomerRedirect(value)) return null;
  return value!.trim();
}

/** Safe post-login redirect for any non-admin role. */
export function safePostLoginRedirect(value: string | null | undefined): string | null {
  if (isBlockedCustomerRedirect(value)) return null;
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.includes("://")) return null;
  if (!trimmed.startsWith("/")) return null;
  return trimmed;
}

/** Login / password-reset form targets only. */
export function safeLoginPath(value: string | null | undefined, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.includes("://")) return fallback;
  if (!trimmed.startsWith("/")) return fallback;
  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const allowed = ALLOWED_LOGIN_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)
  );
  return allowed ? trimmed : fallback;
}
