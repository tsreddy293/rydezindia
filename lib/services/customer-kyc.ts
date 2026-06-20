import { createAdminClient } from "@/lib/supabase/admin";
import {
  customerKycDocumentsFromRow,
  customerKycHasRequiredDocs,
  customerKycDisplayStatus,
  normalizeCustomerKycStatus,
  type CustomerKycDocumentSet,
} from "@/lib/admin/customer-kyc-fields";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";

const BUCKET = "customer-kyc";

export type CustomerKycRowStatus = "not_submitted" | "pending" | "approved" | "rejected";

export async function uploadCustomerKycFile(userId: string, key: string, file: File) {
  const db = createAdminClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${key}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getCustomerKyc(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const db = createAdminClient();
    const { data, error } = await db.from("customer_kyc").select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      if (isMissingTableError(error)) {
        console.warn("[getCustomerKyc] customer_kyc table unavailable:", error.message);
        return null;
      }
      console.error("[getCustomerKyc] query failed:", error.code, error.message);
      return null;
    }
    return (data as Record<string, unknown> | null) ?? null;
  } catch (err) {
    console.error("[getCustomerKyc]", err);
    return null;
  }
}

export async function upsertCustomerKyc(input: {
  userId: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  drivingLicenseUrl?: string;
  selfieUrl?: string;
}) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    aadhaar_front_url: input.aadhaarFrontUrl ?? null,
    aadhaar_back_url: input.aadhaarBackUrl ?? null,
    driving_license_url: input.drivingLicenseUrl ?? null,
    selfie_url: input.selfieUrl ?? null,
    status: "pending",
    submitted_at: now,
    reviewed_at: null,
    reviewed_by: null,
    updated_at: now,
  };

  let { data, error } = await db
    .from("customer_kyc")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error && isMissingColumnError(error, "aadhaar_front_url", "submitted_at")) {
    const legacyPayload = {
      user_id: input.userId,
      aadhaar_url: input.aadhaarFrontUrl ?? null,
      license_url: input.drivingLicenseUrl ?? null,
      selfie_url: input.selfieUrl ?? null,
      status: "pending",
      updated_at: now,
    };
    ({ data, error } = await db
      .from("customer_kyc")
      .upsert(legacyPayload, { onConflict: "user_id" })
      .select("*")
      .single());
  }

  if (error) throw new Error(error.message);

  await db.from("users").update({ kyc_status: "pending" }).eq("id", input.userId);

  const profilePayload = { user_id: input.userId, kyc_status: "pending", updated_at: now };
  const profileResult = await db.from("customer_profiles").upsert(profilePayload, { onConflict: "user_id" });
  if (profileResult.error && !profileResult.error.message.includes("does not exist")) {
    console.warn("[upsertCustomerKyc] customer_profiles sync:", profileResult.error.message);
  }

  return data;
}

export function readCustomerKycDocuments(row: Record<string, unknown> | null): CustomerKycDocumentSet {
  return customerKycDocumentsFromRow(row ?? undefined);
}

export { customerKycDisplayStatus, customerKycHasRequiredDocs };

export function isCustomerKycApprovedStatus(status: unknown): boolean {
  return normalizeCustomerKycStatus(status) === "approved";
}

export async function isCustomerKycVerified(userId: string): Promise<boolean> {
  const kyc = await getCustomerKyc(userId);
  if (kyc && isCustomerKycApprovedStatus(kyc.status)) return true;
  const db = createAdminClient();
  const { data } = await db.from("users").select("kyc_status").eq("id", userId).maybeSingle();
  return normalizeCustomerKycStatus((data as { kyc_status?: string } | null)?.kyc_status) === "approved";
}

export async function listCustomerKyc(status?: string) {
  try {
    const db = createAdminClient();
    let query = db.from("customer_kyc").select("*").order("submitted_at", { ascending: false });
    if (status) query = query.eq("status", status);
    let { data, error } = await query;
    if (error && isMissingColumnError(error, "submitted_at")) {
      let fallback = db.from("customer_kyc").select("*").order("created_at", { ascending: false });
      if (status) fallback = fallback.eq("status", status);
      ({ data, error } = await fallback);
    }
    if (error) {
      if (isMissingTableError(error)) return [];
      console.error("[listCustomerKyc]", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("[listCustomerKyc]", err);
    return [];
  }
}

export function customerKycReadyForReview(docs: CustomerKycDocumentSet): boolean {
  return customerKycHasRequiredDocs(docs);
}
