import type { OwnerStatus } from "@/lib/admin/owner-status";

export type OwnerKycDocuments = {
  aadhaar?: string;
  license?: string;
};

/** Approval requires uploaded Aadhaar and Driving License document files. */
export function ownerKycCanApprove(documents: OwnerKycDocuments): boolean {
  return Boolean(documents.aadhaar?.trim()) && Boolean(documents.license?.trim());
}

export function ownerKycMissingDocuments(documents: OwnerKycDocuments): string[] {
  const missing: string[] = [];
  if (!documents.aadhaar?.trim()) missing.push("Aadhaar");
  if (!documents.license?.trim()) missing.push("Driving License");
  return missing;
}

export function ownerKycApprovalError(documents: OwnerKycDocuments): string | null {
  if (ownerKycCanApprove(documents)) return null;
  return "Documents Required: Aadhaar and Driving License must be uploaded before approval.";
}

export type OwnerKycStatus = OwnerStatus;
