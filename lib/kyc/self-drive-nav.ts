/** Customer self-drive KYC navigation — never use /admin routes. */

export function selfDriveKycPath(bookingReturnPath?: string): string {
  if (!bookingReturnPath) return "/dashboard/kyc?reason=self_drive";
  return `/dashboard/kyc?reason=self_drive&return=${encodeURIComponent(bookingReturnPath)}`;
}

export function selfDriveKycLoginPath(kycPath?: string): string {
  const target = kycPath ?? "/dashboard/kyc?reason=self_drive";
  return `/login/rider?redirect=${encodeURIComponent(target)}`;
}

/** Rider logged in → KYC page; guest or wrong role → rider login with redirect back to KYC. */
export function resolveSelfDriveKycHref(
  isRiderLoggedIn: boolean,
  bookingReturnPath?: string
): string {
  const kycPath = selfDriveKycPath(bookingReturnPath);
  return isRiderLoggedIn ? kycPath : selfDriveKycLoginPath(kycPath);
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
