import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeRole, ROLE_LOGIN_PATHS } from "@/lib/auth/roles";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { resolveAuthenticatedUserRole } from "@/lib/auth/get-role-for-user";
import { homePathForRole, RIDER_DASHBOARD_PATH } from "@/lib/auth/rbac-paths";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";
import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

/** Redirect to rider login — never sends customers to /admin. */
export function redirectToCustomerLogin(returnPath?: string | null): never {
  const safe = safeRiderRedirectPath(returnPath ?? "");
  if (safe) {
    redirect(bookingAuthLoginPath(safe));
  }
  redirect(ROLE_LOGIN_PATHS.rider);
}

/**
 * Hard gate for customer booking pages.
 * Returns authenticated rider only; otherwise redirects to login with returnTo.
 */
export async function requireRiderForBooking(returnPath?: string): Promise<{
  user: User;
  role: "rider";
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirectToCustomerLogin(returnPath);
  }

  const currentRole =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";

  if (currentRole !== "rider") {
    redirect(homePathForRole(currentRole));
  }

  return { user: data.user, role: "rider" };
}

/** Server actions / APIs — authenticated rider required (no guest bookings). */
export async function assertAuthenticatedRiderForBooking(): Promise<
  ActionResult<{ user: User }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { success: false, error: "Please sign in to continue your booking." };
  }

  const currentRole =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";

  if (currentRole !== "rider") {
    return {
      success: false,
      error: "Please sign in with a rider account to complete your booking.",
    };
  }

  return { success: true, data: { user: data.user } };
}

/**
 * Guard for /dashboard/* rider pages.
 * Authenticated wrong-role users go to their own dashboard — never /admin for riders.
 */
export async function requireRiderDashboard(returnPath?: string): Promise<{
  user: User;
  role: "rider";
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirectToCustomerLogin(returnPath ?? RIDER_DASHBOARD_PATH);
  }

  const currentRole = await resolveAuthenticatedUserRole(
    data.user.id,
    data.user.user_metadata?.role
  );

  if (currentRole !== "rider") {
    redirect(homePathForRole(currentRole));
  }

  return { user: data.user, role: "rider" };
}
