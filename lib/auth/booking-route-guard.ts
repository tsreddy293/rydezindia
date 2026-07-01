import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

/** All customer checkout routes live under /booking (including pay, confirmation, invoice). */
export function isBookingRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/booking" || path.startsWith("/booking/");
}

export function normalizeBookingReturnPath(pathname: string, search = ""): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  return search ? `${path}${search}` : path;
}

/** Rider login with post-auth return to the intended booking URL. */
export function bookingLoginRedirectUrl(returnPath: string): string {
  const safe = safeRiderRedirectPath(returnPath);
  if (safe) {
    return `/login/rider?redirect=${encodeURIComponent(safe)}`;
  }
  return "/login/rider";
}
