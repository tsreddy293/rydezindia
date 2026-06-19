import type { OwnerKycDisplayStatus } from "@/lib/admin/owner-kyc";
import { normalizeOwnerStatus, type OwnerStatus } from "@/lib/admin/owner-status";

export type DocumentsStatus = "pending" | "approved" | "rejected";

export const KYC_APPROVAL_REQUIRED_MESSAGE = "KYC approval required";
export const KYC_REQUIRED_FOR_VEHICLE_MESSAGE =
  "Complete KYC verification before adding vehicles. Upload documents at /owner/kyc.";
export const KYC_REJECTED_FOR_VEHICLE_MESSAGE =
  "KYC was rejected. Re-upload documents at /owner/kyc before adding vehicles.";
export const DOCUMENTS_APPROVAL_REQUIRED_MESSAGE = "Documents approval required";

export function isOwnerKycApproved(kycStatus: unknown): boolean {
  const value = String(kycStatus ?? "").toLowerCase();
  return value === "verified" || value === "approved";
}

export function isStrictOwnerApproved(ownerStatus: unknown): boolean {
  return normalizeOwnerStatus(ownerStatus, undefined) === "approved";
}

/** Vehicle creation allowed when KYC is pending review or fully approved. */
export function ownerCanCreateVehicle(kycDisplayStatus: OwnerKycDisplayStatus | string): boolean {
  const value = String(kycDisplayStatus).toLowerCase();
  return value === "pending" || value === "verified" || value === "approved";
}

export function ownerCreateVehicleBlockedReason(
  kycDisplayStatus: OwnerKycDisplayStatus | string
): string | null {
  const value = String(kycDisplayStatus).toLowerCase();
  if (value === "rejected") return KYC_REJECTED_FOR_VEHICLE_MESSAGE;
  if (!ownerCanCreateVehicle(value)) return KYC_REQUIRED_FOR_VEHICLE_MESSAGE;
  return null;
}

export function normalizeDocumentsStatus(value: unknown): DocumentsStatus {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

export function vehicleApprovalBlockedReason(input: {
  ownerStatus: unknown;
  kycStatus: unknown;
}): string | null {
  if (!isStrictOwnerApproved(input.ownerStatus)) {
    return "Owner approval required";
  }
  if (!isOwnerKycApproved(input.kycStatus)) {
    return KYC_APPROVAL_REQUIRED_MESSAGE;
  }
  return null;
}

export function vehicleCanBeApprovedByAdmin(input: {
  ownerStatus: unknown;
  kycStatus: unknown;
}): boolean {
  return vehicleApprovalBlockedReason(input) === null;
}

/** Customer-facing listings require all four approvals. */
export function isVehicleCustomerListable(input: {
  ownerStatus: unknown;
  kycStatus: unknown;
  vehicleApprovalStatus: unknown;
  documentsStatus: unknown;
}): boolean {
  if (!isStrictOwnerApproved(input.ownerStatus)) return false;
  if (!isOwnerKycApproved(input.kycStatus)) return false;
  if (String(input.vehicleApprovalStatus ?? "").toLowerCase() !== "approved") return false;
  if (normalizeDocumentsStatus(input.documentsStatus) !== "approved") return false;
  return true;
}

export function ownerMarketplaceEligibilityFromRow(row: {
  owner_status?: unknown;
  kyc_status?: unknown;
}): {
  ownerStatus: OwnerStatus;
  kycStatus: string;
  ownerApproved: boolean;
  kycApproved: boolean;
} {
  const kycStatus = String(row.kyc_status ?? "not_submitted");
  const ownerStatus = normalizeOwnerStatus(row.owner_status, undefined);
  return {
    ownerStatus,
    kycStatus,
    ownerApproved: isStrictOwnerApproved(row.owner_status),
    kycApproved: isOwnerKycApproved(kycStatus),
  };
}
