import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { normalizeRole, ROLE_LOGIN_PATHS } from "@/lib/auth/roles";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";
import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";
import { createClient } from "@/lib/supabase/server";

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
    redirectToCustomerLogin(returnPath);
  }

  return { user: data.user, role: "rider" };
}
