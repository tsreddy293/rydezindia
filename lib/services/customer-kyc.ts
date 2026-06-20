import { createAdminClient } from "@/lib/supabase/admin";
import {
  customerKycDocumentsFromRow,
  customerKycHasRequiredDocs,
  customerKycDisplayStatus,
  normalizeCustomerKycStatus,
  type CustomerKycDocumentSet,
} from "@/lib/admin/customer-kyc-fields";
import { isMissingColumnError } from "@/lib/supabase/errors";
import {
  KYC_STORAGE_BUCKETS,
  kycObjectPath,
  uploadKycDocument,
} from "@/lib/kyc/kyc-storage";
import { KycSubmitError, logKycFailure, supabaseErrorToDetail } from "@/lib/kyc/kyc-errors";

const BUCKET = KYC_STORAGE_BUCKETS.customer;

export type CustomerKycRowStatus = "not_submitted" | "pending" | "approved" | "rejected";

export type CustomerKycQueryResult = Record<string, unknown> & {
  status: CustomerKycRowStatus | string;
  user_id?: string;
};

function notSubmittedKyc(userId: string): CustomerKycQueryResult {
  return { status: "not_submitted", user_id: userId };
}

/** True when a persisted row exists in public.customer_kyc (not the not_submitted stub). */
export function hasCustomerKycRecord(row: Record<string, unknown> | null | undefined): boolean {
  return Boolean(row?.id);
}

export async function uploadCustomerKycFile(userId: string, key: string, file: File) {
  const db = createAdminClient();
  const path = kycObjectPath(userId, key, file.name);
  return uploadKycDocument(db, BUCKET, path, file, { userId, field: key });
}

export async function getCustomerKyc(userId: string): Promise<CustomerKycQueryResult> {
  const db = createAdminClient();
  const { data, error } = await db.from("customer_kyc").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    console.error("[getCustomerKyc] query failed:", { userId, code: error.code, message: error.message });
    return notSubmittedKyc(userId);
  }

  if (!data) {
    return notSubmittedKyc(userId);
  }

  return data as CustomerKycQueryResult;
}

/** Insert or update by user_id without requiring ON CONFLICT / UNIQUE constraint. */
async function writeCustomerKycRow(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  payload: Record<string, unknown>
) {
  const { data: existing, error: findError } = await db
    .from("customer_kyc")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    return { data: null, error: findError };
  }

  if (existing?.id) {
    return db.from("customer_kyc").update(payload).eq("id", existing.id).select("*").single();
  }

  return db.from("customer_kyc").insert({ ...payload, user_id: userId }).select("*").single();
}

export async function upsertCustomerKyc(input: {
  userId: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  drivingLicenseUrl?: string;
  selfieUrl?: string;
  selfDriveReturnPath?: string | null;
}) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  let payload: Record<string, unknown> = {
    user_id: input.userId,
    aadhaar_front_url: input.aadhaarFrontUrl ?? null,
    aadhaar_back_url: input.aadhaarBackUrl ?? null,
    driving_license_url: input.drivingLicenseUrl ?? null,
    selfie_url: input.selfieUrl ?? null,
    status: "pending",
    submitted_at: now,
    approved_at: null,
    rejected_at: null,
    reviewed_by: null,
    updated_at: now,
  };

  if (input.selfDriveReturnPath) {
    payload.self_drive_return_path = input.selfDriveReturnPath;
  }

  let { data, error } = await writeCustomerKycRow(db, input.userId, payload);

  console.info("[upsertCustomerKyc] write attempt", {
    userId: input.userId,
    hasFront: Boolean(input.aadhaarFrontUrl),
    hasBack: Boolean(input.aadhaarBackUrl),
    hasLicense: Boolean(input.drivingLicenseUrl),
    hasSelfie: Boolean(input.selfieUrl),
    error: error ? { code: error.code, message: error.message, hint: error.hint } : null,
  });

  if (error && isMissingColumnError(error, "self_drive_return_path", "rejected_at", "approved_at", "submitted_at", "reviewed_by")) {
    if ("self_drive_return_path" in payload) delete payload.self_drive_return_path;
    if (error.message.includes("rejected_at")) delete payload.rejected_at;
    if (error.message.includes("approved_at")) delete payload.approved_at;
    if (error.message.includes("submitted_at")) delete payload.submitted_at;
    if (error.message.includes("reviewed_by")) delete payload.reviewed_by;
    ({ data, error } = await writeCustomerKycRow(db, input.userId, payload));
  }

  if (error && isMissingColumnError(error, "aadhaar_front_url", "submitted_at", "rejected_at")) {
    console.warn("[upsertCustomerKyc] retrying with legacy column names", {
      code: error.code,
      message: error.message,
    });
    payload = {
      user_id: input.userId,
      aadhaar_url: input.aadhaarFrontUrl ?? null,
      license_url: input.drivingLicenseUrl ?? null,
      selfie_url: input.selfieUrl ?? null,
      status: "pending",
      updated_at: now,
    };
    ({ data, error } = await writeCustomerKycRow(db, input.userId, payload));
  }

  if (error) {
    const detail = supabaseErrorToDetail(error, "database", "upsertCustomerKyc");
    logKycFailure("upsertCustomerKyc", detail);
    throw new KycSubmitError(detail);
  }

  const usersResult = await db.from("users").update({ kyc_status: "pending" }).eq("id", input.userId);
  if (usersResult.error) {
    console.error("[upsertCustomerKyc] users.kyc_status update failed", {
      userId: input.userId,
      code: usersResult.error.code,
      message: usersResult.error.message,
    });
  }

  const profilePayload = { user_id: input.userId, kyc_status: "pending", updated_at: now };
  const profileResult = await db.from("customer_profiles").upsert(profilePayload, { onConflict: "user_id" });
  if (profileResult.error && !isMissingColumnError(profileResult.error, "kyc_status", "user_id")) {
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

type CustomerKycReviewInput = {
  userId: string;
  reviewedBy: string;
  remarks?: string;
};

async function syncCustomerKycStatusToUserTables(userId: string, kycStatus: string) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const usersResult = await db.from("users").update({ kyc_status: kycStatus }).eq("id", userId);
  if (usersResult.error) {
    console.warn("[syncCustomerKycStatusToUserTables] users update:", usersResult.error.message);
  }

  const profileResult = await db
    .from("customer_profiles")
    .upsert({ user_id: userId, kyc_status: kycStatus, updated_at: now }, { onConflict: "user_id" });
  if (profileResult.error && !isMissingColumnError(profileResult.error, "kyc_status", "user_id")) {
    console.warn("[syncCustomerKycStatusToUserTables] customer_profiles sync:", profileResult.error.message);
  }
}

export async function approveCustomerKyc(input: CustomerKycReviewInput) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("customer_kyc")
    .update({
      status: "approved",
      reviewed_by: input.reviewedBy,
      approved_at: now,
      rejected_at: null,
      remarks: input.remarks ?? null,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  console.info("[approveCustomerKyc]", {
    userId: input.userId,
    reviewedBy: input.reviewedBy,
    error: error ? { code: error.code, message: error.message } : null,
    rowId: (data as { id?: string } | null)?.id ?? null,
  });

  if (error) {
    const detail = supabaseErrorToDetail(error, "database", "approveCustomerKyc");
    logKycFailure("approveCustomerKyc", detail);
    throw new KycSubmitError(detail);
  }

  if (!data) {
    throw new KycSubmitError({
      phase: "database",
      functionName: "approveCustomerKyc",
      code: "NOT_FOUND",
      message: `No customer_kyc row for user ${input.userId}`,
    });
  }

  await syncCustomerKycStatusToUserTables(input.userId, "approved");
  return data;
}

export async function rejectCustomerKyc(input: CustomerKycReviewInput) {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await db
    .from("customer_kyc")
    .update({
      status: "rejected",
      reviewed_by: input.reviewedBy,
      rejected_at: now,
      approved_at: null,
      remarks: input.remarks ?? null,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .select("*")
    .maybeSingle();

  console.info("[rejectCustomerKyc]", {
    userId: input.userId,
    reviewedBy: input.reviewedBy,
    error: error ? { code: error.code, message: error.message } : null,
    rowId: (data as { id?: string } | null)?.id ?? null,
  });

  if (error) {
    const detail = supabaseErrorToDetail(error, "database", "rejectCustomerKyc");
    logKycFailure("rejectCustomerKyc", detail);
    throw new KycSubmitError(detail);
  }

  if (!data) {
    throw new KycSubmitError({
      phase: "database",
      functionName: "rejectCustomerKyc",
      code: "NOT_FOUND",
      message: `No customer_kyc row for user ${input.userId}`,
    });
  }

  await syncCustomerKycStatusToUserTables(input.userId, "rejected");
  return data;
}
