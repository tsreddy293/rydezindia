import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
import type { OwnerKycDocumentSet } from "@/lib/admin/owner-kyc";

const BUCKET = "owner-kyc";

export type OwnerProfileKycField =
  | "aadhaar_document_url"
  | "license_document_url"
  | "selfie_document_url"
  | "address_proof_url";

const FIELD_TO_KEY: Record<OwnerProfileKycField, keyof OwnerKycDocumentSet> = {
  aadhaar_document_url: "aadhaar",
  license_document_url: "license",
  selfie_document_url: "selfie",
  address_proof_url: "address_proof",
};

export interface OwnerProfileKycRow {
  user_id: string;
  aadhaar_document_url: string | null;
  license_document_url: string | null;
  selfie_document_url: string | null;
  address_proof_url: string | null;
  aadhaar_number: string | null;
  license_number: string | null;
  kyc_submitted_at: string | null;
}

export async function uploadOwnerProfileKycFile(
  ownerId: string,
  field: OwnerProfileKycField,
  file: File
): Promise<string> {
  const db = createAdminClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${ownerId}/${field}-${Date.now()}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) throw new Error(error.message);

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getOwnerProfileKyc(userId: string): Promise<OwnerProfileKycRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("owner_profiles")
    .select(
      "user_id, aadhaar_document_url, license_document_url, selfie_document_url, address_proof_url, aadhaar_number, license_number, kyc_submitted_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTableError(error)) return null;
  if (error) throw new Error(error.message);
  if (!data) return null;

  return data as OwnerProfileKycRow;
}

export function ownerProfileDocumentsToSet(
  profile: OwnerProfileKycRow | null | undefined,
  legacy?: Partial<Record<keyof OwnerKycDocumentSet, string | null>>
): OwnerKycDocumentSet {
  return {
    aadhaar: profile?.aadhaar_document_url ?? legacy?.aadhaar ?? undefined,
    license: profile?.license_document_url ?? legacy?.license ?? undefined,
    selfie: profile?.selfie_document_url ?? legacy?.selfie ?? undefined,
    address_proof: profile?.address_proof_url ?? legacy?.address_proof ?? undefined,
  };
}

export async function upsertOwnerProfileKycDocuments(input: {
  userId: string;
  aadhaarUrl?: string;
  licenseUrl?: string;
  selfieUrl?: string;
  addressProofUrl?: string;
}) {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    kyc_submitted_at: now,
    updated_at: now,
  };

  if (input.aadhaarUrl) payload.aadhaar_document_url = input.aadhaarUrl;
  if (input.licenseUrl) payload.license_document_url = input.licenseUrl;
  if (input.selfieUrl) payload.selfie_document_url = input.selfieUrl;
  if (input.addressProofUrl) payload.address_proof_url = input.addressProofUrl;

  let { error } = await db.from("owner_profiles").upsert(payload, { onConflict: "user_id" });

  if (error?.message?.includes("column")) {
    const fallback = { user_id: input.userId, updated_at: now };
    if (input.aadhaarUrl) (fallback as Record<string, string>).aadhaar_document_url = input.aadhaarUrl;
    if (input.licenseUrl) (fallback as Record<string, string>).license_document_url = input.licenseUrl;
    ({ error } = await db.from("owner_profiles").upsert(fallback, { onConflict: "user_id" }));
  }

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error(
        "owner_profiles table is missing. Run supabase/RUN_OWNER_PROFILE_KYC.sql in Supabase SQL Editor."
      );
    }
    throw new Error(error.message);
  }

  await db.from("users").update({ kyc_status: "pending" }).eq("id", input.userId);

  return payload;
}
