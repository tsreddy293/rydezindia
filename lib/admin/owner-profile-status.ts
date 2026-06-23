import type { OwnerStatus } from "@/lib/admin/owner-status";
import { normalizeOwnerStatus } from "@/lib/admin/owner-status";

/** Merge owner approval status from all known stores (single read model). */
export function resolveOwnerAdminStatus(sources: {
  profileOwnerStatus?: string | null;
  profileLegacyStatus?: string | null;
  userOwnerStatus?: string | null;
  vehicleOwnersStatus?: string | null;
  ownersVerificationStatus?: string | null;
}): OwnerStatus {
  const values = [
    sources.profileOwnerStatus,
    sources.profileLegacyStatus,
    sources.userOwnerStatus,
    sources.vehicleOwnersStatus,
    sources.ownersVerificationStatus,
  ]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
    .map((value) => String(value).toLowerCase().trim());

  if (values.some((value) => value === "approved" || value === "verified")) return "approved";
  if (values.some((value) => value === "rejected")) return "rejected";
  return "pending";
}

export function isOwnerAdminApproved(status: OwnerStatus | string): boolean {
  return resolveOwnerAdminStatus({ profileOwnerStatus: status }) === "approved";
}

export function ownerStatusFromRow(
  profileRow?: Record<string, unknown> | null,
  userRow?: Record<string, unknown> | null,
  legacy?: {
    vehicleOwnersStatus?: string | null;
    ownersVerificationStatus?: string | null;
  }
): OwnerStatus {
  return resolveOwnerAdminStatus({
    profileOwnerStatus: profileRow?.owner_status as string | undefined,
    profileLegacyStatus: profileRow?.status as string | undefined,
    userOwnerStatus: userRow?.owner_status as string | undefined,
    vehicleOwnersStatus: legacy?.vehicleOwnersStatus,
    ownersVerificationStatus: legacy?.ownersVerificationStatus,
  });
}

export function normalizeOwnerStatusFromSources(
  profileRow?: Record<string, unknown> | null,
  userRow?: Record<string, unknown> | null,
  kycStatus?: string
): OwnerStatus {
  const merged = ownerStatusFromRow(profileRow, userRow);
  return normalizeOwnerStatus(merged, kycStatus);
}
