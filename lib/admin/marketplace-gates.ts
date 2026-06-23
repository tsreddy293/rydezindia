import type { OwnerKycDisplayStatus } from "@/lib/admin/owner-kyc";
import { normalizeProfileStatus } from "@/lib/admin/owner-profile-fields";
import { normalizeOwnerStatus, type OwnerStatus } from "@/lib/admin/owner-status";

export type DocumentsStatus = "pending" | "approved" | "rejected";

export const KYC_APPROVAL_REQUIRED_MESSAGE = "KYC approval required";
export const OWNER_KYC_REQUIRED_FOR_DOCUMENTS = "Owner KYC must be approved before document approval.";
export const OWNER_APPROVAL_REQUIRED_FOR_VEHICLE =
  "Owner approval required before vehicle approval.";
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
  const ownerStatus = String(input.ownerStatus ?? "").toLowerCase();
  const kycStatus = String(input.kycStatus ?? "").toLowerCase();

  if (ownerStatus !== "approved") {
    return "Owner approval required";
  }
  if (kycStatus !== "approved") {
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

/** Customer-facing listings: owner + KYC + vehicle approval (admin source of truth). */
export function isVehicleCustomerListable(input: {
  ownerStatus: unknown;
  kycStatus: unknown;
  vehicleApprovalStatus: unknown;
  documentsStatus?: unknown;
}): boolean {
  const ownerStatus = String(input.ownerStatus ?? "").toLowerCase().trim();
  const vehicleApproved =
    String(input.vehicleApprovalStatus ?? "").toLowerCase().trim() === "approved";

  if (ownerStatus !== "approved") return false;
  if (!isOwnerKycApproved(input.kycStatus)) return false;
  if (!vehicleApproved) return false;

  // Vehicle admin approval is sufficient — do not require a separate documents_status
  // flag that admin may never set when approving the vehicle.
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
  const ownerStatus = normalizeProfileStatus(row.owner_status, "pending");
  const kycStatus = normalizeProfileStatus(row.kyc_status, "pending");
  return {
    ownerStatus,
    kycStatus,
    ownerApproved: ownerStatus === "approved",
    kycApproved: kycStatus === "approved",
  };
}
