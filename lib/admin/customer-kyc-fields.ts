export type CustomerKycDocumentSet = {
  aadhaar_front_url?: string;
  aadhaar_back_url?: string;
  driving_license_url?: string;
  selfie_url?: string;
};

export type CustomerKycAdminDocuments = {
  aadhaar_front?: string;
  aadhaar_back?: string;
  driving_license?: string;
  selfie?: string;
};

/** Read document URLs from customer_kyc row (new + legacy columns). */
export function customerKycDocumentsFromRow(row: Record<string, unknown> | null | undefined): CustomerKycDocumentSet {
  if (!row) return {};
  return {
    aadhaar_front_url:
      stringOrEmpty(row.aadhaar_front_url) || stringOrEmpty(row.aadhaar_url) || undefined,
    aadhaar_back_url: stringOrEmpty(row.aadhaar_back_url) || undefined,
    driving_license_url:
      stringOrEmpty(row.driving_license_url) || stringOrEmpty(row.license_url) || undefined,
    selfie_url: stringOrEmpty(row.selfie_url) || undefined,
  };
}

export function customerKycDocumentsForAdmin(
  row: Record<string, unknown> | null | undefined
): CustomerKycAdminDocuments {
  const docs = customerKycDocumentsFromRow(row);
  return {
    aadhaar_front: docs.aadhaar_front_url,
    aadhaar_back: docs.aadhaar_back_url,
    driving_license: docs.driving_license_url,
    selfie: docs.selfie_url,
  };
}

export function customerKycHasRequiredDocs(docs: CustomerKycDocumentSet): boolean {
  return Boolean(docs.aadhaar_front_url && docs.aadhaar_back_url && docs.driving_license_url);
}

export function normalizeCustomerKycStatus(value: unknown): "pending" | "approved" | "rejected" | "not_submitted" {
  const raw = String(value ?? "not_submitted").toLowerCase();
  if (raw === "approved" || raw === "verified") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "pending" || raw === "submitted") return "pending";
  return "not_submitted";
}

export function customerKycDisplayStatus(
  rowStatus: unknown,
  docs: CustomerKycDocumentSet
): "not_submitted" | "pending" | "approved" | "rejected" {
  const normalized = normalizeCustomerKycStatus(rowStatus);
  if (normalized === "approved" || normalized === "rejected") return normalized;
  if (normalized === "pending" || customerKycHasRequiredDocs(docs)) return "pending";
  return "not_submitted";
}

function stringOrEmpty(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
