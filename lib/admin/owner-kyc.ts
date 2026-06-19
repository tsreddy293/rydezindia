import type { OwnerStatus } from "@/lib/admin/owner-status";

export type OwnerKycDocumentSet = {
  aadhaar?: string;
  license?: string;
  selfie?: string;
  address_proof?: string;
  pan?: string;
  rc?: string;
  insurance?: string;
};

/** Approval requires uploaded Aadhaar and Driving License document files. */
export function ownerKycCanApprove(documents: OwnerKycDocumentSet): boolean {
  return Boolean(documents.aadhaar?.trim()) && Boolean(documents.license?.trim());
}

export function ownerKycMissingDocuments(documents: OwnerKycDocumentSet): string[] {
  const missing: string[] = [];
  if (!documents.aadhaar?.trim()) missing.push("Aadhaar");
  if (!documents.license?.trim()) missing.push("Driving License");
  return missing;
}

export function ownerKycApprovalError(documents: OwnerKycDocumentSet): string | null {
  if (ownerKycCanApprove(documents)) return null;
  return "Documents Required: Aadhaar and Driving License must be uploaded before approval.";
}

export function normalizeOwnerKycDisplayStatus(kycStatus: string): OwnerStatus {
  const value = kycStatus.toLowerCase();
  if (value === "verified" || value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  if (value === "pending") return "pending";
  return "pending";
}

export type OwnerKycStatus = OwnerStatus;

export type OwnerKycDisplayStatus = "not_submitted" | "pending" | "verified" | "rejected";

/** Resolve badge status from users.kyc_status and owner_profiles submission state. */
export function resolveOwnerKycDisplayStatus(input: {
  userKycStatus?: string | null;
  profileKycStatus?: string | null;
  kycSubmittedAt?: string | null;
  hasRequiredDocs?: boolean;
}): OwnerKycDisplayStatus {
  const user = (input.userKycStatus ?? "").toLowerCase();
  const profile = (input.profileKycStatus ?? "").toLowerCase();

  if (user === "verified" || user === "approved" || profile === "verified" || profile === "approved") {
    return "verified";
  }
  if (user === "rejected" || profile === "rejected") return "rejected";
  if (
    user === "pending" ||
    profile === "pending" ||
    profile === "submitted" ||
    (input.kycSubmittedAt && input.hasRequiredDocs)
  ) {
    return "pending";
  }
  if (input.hasRequiredDocs) return "pending";

  return "not_submitted";
}
