import type { OwnerStatus } from "@/lib/admin/owner-status";

/** Merge KYC status from owner_profiles, users, and legacy owner_kyc. */
export function resolveOwnerKycAdminStatus(sources: {
  profileKyc?: string | null;
  userKyc?: string | null;
  legacyKyc?: string | null;
}): OwnerStatus {
  const values = [sources.profileKyc, sources.userKyc, sources.legacyKyc]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value).toLowerCase());

  if (values.some((value) => value === "approved" || value === "verified")) return "approved";
  if (values.some((value) => value === "rejected")) return "rejected";
  return "pending";
}

export function isOwnerKycAdminApproved(status: OwnerStatus | string): boolean {
  return resolveOwnerKycAdminStatus({ profileKyc: status }) === "approved";
}
