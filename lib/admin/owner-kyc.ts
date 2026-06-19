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
