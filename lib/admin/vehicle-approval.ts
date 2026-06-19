import { type OwnerStatus } from "@/lib/admin/owner-status";
import {
  isStrictOwnerApproved,
  isVehicleCustomerListable,
  vehicleApprovalBlockedReason as getVehicleApprovalBlockedReason,
} from "@/lib/admin/marketplace-gates";

export const OWNER_APPROVAL_REQUIRED_MESSAGE = "Owner approval required";

export function isOwnerApprovedForVehicleApproval(ownerStatus: unknown): boolean {
  return isStrictOwnerApproved(ownerStatus);
}

export function vehicleCanBeApproved(
  ownerStatus: OwnerStatus | string,
  kycStatus?: unknown
): boolean {
  return getVehicleApprovalBlockedReason({ ownerStatus, kycStatus }) === null;
}

export function vehicleApprovalBlockedReasonForOwner(
  ownerStatus: OwnerStatus | string,
  kycStatus?: unknown
): string | null {
  return getVehicleApprovalBlockedReason({ ownerStatus, kycStatus });
}

/** @deprecated Use vehicleApprovalBlockedReasonForOwner */
export function vehicleApprovalBlockedReason(ownerStatus: OwnerStatus | string): string | null {
  return vehicleApprovalBlockedReasonForOwner(ownerStatus);
}

/** Effective vehicle stat for dashboard — approved only when owner is also approved. */
export function effectiveVehicleStat(
  approvalStatus: string,
  ownerStatus: OwnerStatus | string,
  kycStatus?: unknown,
  documentsStatus?: unknown
): "approved" | "pending" | "rejected" {
  const vehicle = approvalStatus.toLowerCase();
  if (vehicle === "rejected") return "rejected";
  if (
    vehicle === "approved" &&
    isVehicleCustomerListable({
      ownerStatus,
      kycStatus,
      vehicleApprovalStatus: approvalStatus,
      documentsStatus,
    })
  ) {
    return "approved";
  }
  if (vehicle === "approved" && isStrictOwnerApproved(ownerStatus)) return "pending";
  return "pending";
}
