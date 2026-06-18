import { normalizeOwnerStatus, type OwnerStatus } from "@/lib/admin/owner-status";

export const OWNER_APPROVAL_REQUIRED_MESSAGE = "Owner approval required";

export function isOwnerApprovedForVehicleApproval(ownerStatus: unknown): boolean {
  return normalizeOwnerStatus(ownerStatus) === "approved";
}

export function vehicleCanBeApproved(ownerStatus: OwnerStatus | string): boolean {
  return isOwnerApprovedForVehicleApproval(ownerStatus);
}

export function vehicleApprovalBlockedReason(ownerStatus: OwnerStatus | string): string | null {
  if (vehicleCanBeApproved(ownerStatus)) return null;
  return OWNER_APPROVAL_REQUIRED_MESSAGE;
}

/** Effective vehicle stat for dashboard — approved only when owner is also approved. */
export function effectiveVehicleStat(
  approvalStatus: string,
  ownerStatus: OwnerStatus | string
): "approved" | "pending" | "rejected" {
  const vehicle = approvalStatus.toLowerCase();
  if (vehicle === "rejected") return "rejected";
  if (vehicle === "approved" && isOwnerApprovedForVehicleApproval(ownerStatus)) return "approved";
  return "pending";
}
