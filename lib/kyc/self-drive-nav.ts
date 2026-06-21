/** Customer self-drive KYC navigation — never use /admin routes. */

import { bookingAuthLoginPath } from "@/lib/booking/booking-return-path";

export function isSelfDriveBookingPath(path: string): boolean {
  return path.includes("/booking/") && path.includes("type=self_drive");
}

export function selfDriveKycPath(bookingReturnPath?: string): string {
  if (!bookingReturnPath) return "/dashboard/kyc?reason=self_drive";
  return `/dashboard/kyc?reason=self_drive&return=${encodeURIComponent(bookingReturnPath)}`;
}

/** Login first — return to booking after auth (preserves search params in return path). */
export function selfDriveAuthLoginPath(bookingReturnPath: string): string {
  return bookingAuthLoginPath(bookingReturnPath);
}

export function selfDriveAuthSignupPath(bookingReturnPath?: string): string {
  if (!bookingReturnPath) return "/signup/rider";
  return `/signup/rider?redirect=${encodeURIComponent(bookingReturnPath)}`;
}

export function selfDriveKycLoginPath(kycPath?: string): string {
  const target = kycPath ?? "/dashboard/kyc?reason=self_drive";
  return `/login/rider?redirect=${encodeURIComponent(target)}`;
}

/** Rider logged in → KYC page; guest → login with booking return (not KYC first). */
export function resolveSelfDriveKycHref(
  isRiderLoggedIn: boolean,
  bookingReturnPath?: string
): string {
  if (isRiderLoggedIn) return selfDriveKycPath(bookingReturnPath);
  if (bookingReturnPath) return selfDriveAuthLoginPath(bookingReturnPath);
  return "/login/rider";
}

/** Safe post-login redirect for rider flows (blocks /admin and external URLs). */
export function safeRiderRedirectPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/admin")) return null;
  return trimmed;
}

export function buildDashboardKycReturnPath(params: {
  reason?: string;
  return?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.reason) qs.set("reason", params.reason);
  if (params.return) qs.set("return", params.return);
  const query = qs.toString();
  return query ? `/dashboard/kyc?${query}` : "/dashboard/kyc";
}
