export type KycUploadField = "aadhaar_front" | "aadhaar_back" | "driving_license" | "selfie";

export const KYC_UPLOAD_RULES: Record<
  KycUploadField,
  { label: string; maxBytes: number; accept: string; mimeTypes: string[] }
> = {
  aadhaar_front: {
    label: "Aadhaar Front",
    maxBytes: 500 * 1024,
    accept: "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf",
    mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  },
  aadhaar_back: {
    label: "Aadhaar Back",
    maxBytes: 500 * 1024,
    accept: "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf",
    mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  },
  driving_license: {
    label: "Driving License",
    maxBytes: 500 * 1024,
    accept: "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf",
    mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  },
  selfie: {
    label: "Selfie",
    maxBytes: 300 * 1024,
    accept: "image/jpeg,image/png,.jpg,.jpeg,.png",
    mimeTypes: ["image/jpeg", "image/png"],
  },
};

function extensionOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function validateKycUploadFile(
  file: File,
  field: KycUploadField
): string | null {
  const rule = KYC_UPLOAD_RULES[field];
  const ext = extensionOf(file.name);
  const allowedExts = field === "selfie" ? ["jpg", "jpeg", "png"] : ["jpg", "jpeg", "png", "pdf"];

  if (!allowedExts.includes(ext) && !rule.mimeTypes.includes(file.type)) {
    return `${rule.label}: Only ${field === "selfie" ? "JPG or PNG" : "JPG, PNG, or PDF"} files are allowed.`;
  }

  if (file.size > rule.maxBytes) {
    const maxKb = Math.round(rule.maxBytes / 1024);
    return `${rule.label}: File must be ${maxKb} KB or smaller. Your file is ${Math.ceil(file.size / 1024)} KB.`;
  }

  return null;
}

export function formatMaxSizeLabel(field: KycUploadField): string {
  const kb = Math.round(KYC_UPLOAD_RULES[field].maxBytes / 1024);
  return field === "selfie" ? `JPG/PNG, max ${kb} KB` : `JPG/PNG/PDF, max ${kb} KB`;
}

export type OwnerKycUploadField = "aadhaar" | "license" | "selfie" | "address_proof";

const OWNER_FIELD_RULE: Record<OwnerKycUploadField, KycUploadField> = {
  aadhaar: "aadhaar_front",
  license: "driving_license",
  selfie: "selfie",
  address_proof: "aadhaar_front",
};

export function validateOwnerKycUploadFile(file: File, field: OwnerKycUploadField): string | null {
  return validateKycUploadFile(file, OWNER_FIELD_RULE[field]);
}

export function ownerKycUploadRule(field: OwnerKycUploadField) {
  return KYC_UPLOAD_RULES[OWNER_FIELD_RULE[field]];
}
