import { isBlockedCustomerRedirect } from "@/lib/auth/rbac-paths";

/** Safe post-login redirect for owner flows (blocks /admin and external URLs). */
export function safeOwnerRedirectPath(value: string | null | undefined): string | null {
  if (isBlockedCustomerRedirect(value)) return null;
  return value!.trim();
}

/** Safe post-login redirect for any non-admin role. */
export function safePostLoginRedirect(value: string | null | undefined): string | null {
  if (isBlockedCustomerRedirect(value)) return null;
  return value!.trim();
}
