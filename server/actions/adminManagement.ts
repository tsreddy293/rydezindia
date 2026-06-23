"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileKycIsApproved } from "@/lib/admin/owner-profile-fields";
import { ownerKycApprovalError } from "@/lib/admin/owner-kyc";
import { ownerProfileDocumentsToSet } from "@/lib/services/owner-profile-kyc";
import { createNotification } from "@/lib/services/notifications";
import { logApproval } from "@/lib/services/verification";
import { syncOwnerApprovalToProfile } from "@/lib/services/owner-approval-sync";
import { requireRole } from "@/server/actions/auth";
import { getAdminOwnerManagementList } from "@/lib/supabase/queries";
import type { ActionResult, AdminOwnerManagementRecord } from "@/types/database";

const ADMIN_PATHS = [
  "/admin",
  "/admin/owner-management",
  "/admin/customer-management",
  "/admin/vehicles",
  "/admin/kyc",
  "/admin/owners",
  "/admin/users",
  "/admin/customer-kyc",
];

const OWNER_PATHS = ["/owner/dashboard", "/owner/kyc", "/owner/profile", "/owner/add-vehicle", "/owner/my-vehicles"];

function revalidateAdmin() {
  ADMIN_PATHS.forEach((path) => revalidatePath(path));
  OWNER_PATHS.forEach((path) => revalidatePath(path));
}

type OwnerProfileRow = {
  user_id: string;
  kyc_status: string;
  owner_status: string;
  approved_at: string | null;
  approved_by: string | null;
  updated_at?: string | null;
};

type WriteOwnerProfileResult = {
  data: OwnerProfileRow | null;
  error: string | null;
  rowsAffected: number;
};

async function updateOwnerProfileOnly(
  userId: string,
  patch: Record<string, unknown>
): Promise<WriteOwnerProfileResult> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const payload = { ...patch, updated_at: now };

  console.log("[updateOwnerProfileOnly] UPDATE owner_profiles", { userId, payload });

  const updateResult = await db
    .from("owner_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, kyc_status, owner_status, approved_at, approved_by, updated_at");

  console.log("[updateOwnerProfileOnly] UPDATE response", {
    userId,
    error: updateResult.error,
    rowsAffected: updateResult.data?.length ?? 0,
    data: updateResult.data,
  });

  if (updateResult.error) {
    console.error("[updateOwnerProfileOnly] UPDATE error", updateResult.error);
    return { data: null, error: updateResult.error.message, rowsAffected: 0 };
  }

  const rowsAffected = updateResult.data?.length ?? 0;
  return {
    data: (updateResult.data?.[0] as OwnerProfileRow | undefined) ?? null,
    error: rowsAffected === 0 ? "owner_profiles update affected 0 rows." : null,
    rowsAffected,
  };
}

async function writeOwnerProfile(
  userId: string,
  patch: Record<string, unknown>,
  existingProfile?: Record<string, unknown> | null
): Promise<WriteOwnerProfileResult> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const payload = { ...patch, updated_at: now };

  console.log("[writeOwnerProfile] UPDATE owner_profiles", { userId, payload });

  const updateResult = await db
    .from("owner_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, kyc_status, owner_status, approved_at, approved_by, updated_at");

  console.log("[writeOwnerProfile] UPDATE response", {
    userId,
    error: updateResult.error,
    rowsAffected: updateResult.data?.length ?? 0,
    data: updateResult.data,
  });

  if (updateResult.error) {
    console.error("[writeOwnerProfile] UPDATE error", updateResult.error);
    return { data: null, error: updateResult.error.message, rowsAffected: 0 };
  }

  if (updateResult.data && updateResult.data.length > 0) {
    return {
      data: updateResult.data[0] as OwnerProfileRow,
      error: null,
      rowsAffected: updateResult.data.length,
    };
  }

  console.warn("[writeOwnerProfile] UPDATE affected 0 rows — trying UPSERT", { userId });

  const upsertPayload: Record<string, unknown> = {
    user_id: userId,
    ...(existingProfile ?? {}),
    ...payload,
  };
  delete upsertPayload.id;

  const upsertResult = await db
    .from("owner_profiles")
    .upsert(upsertPayload, { onConflict: "user_id" })
    .select("user_id, kyc_status, owner_status, approved_at, approved_by, updated_at");

  console.log("[writeOwnerProfile] UPSERT response", {
    userId,
    error: upsertResult.error,
    rowsAffected: upsertResult.data?.length ?? 0,
    data: upsertResult.data,
  });

  if (upsertResult.error) {
    console.error("[writeOwnerProfile] UPSERT error", upsertResult.error);
    return { data: null, error: upsertResult.error.message, rowsAffected: 0 };
  }

  if (!upsertResult.data || upsertResult.data.length === 0) {
    return {
      data: null,
      error: "owner_profiles update affected 0 rows and upsert returned no data.",
      rowsAffected: 0,
    };
  }

  return {
    data: upsertResult.data[0] as OwnerProfileRow,
    error: null,
    rowsAffected: upsertResult.data.length,
  };
}

async function verifyOwnerProfileRow(
  userId: string,
  expected: { kyc_status?: string; owner_status?: string }
): Promise<{ ok: boolean; row: OwnerProfileRow | null; error?: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("owner_profiles")
    .select("user_id, kyc_status, owner_status, approved_at, approved_by, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("[verifyOwnerProfileRow] read-back", { userId, data, error });

  if (error) {
    return { ok: false, row: null, error: error.message };
  }

  if (!data) {
    return { ok: false, row: null, error: "owner_profiles row not found after update." };
  }

  const row = data as OwnerProfileRow;

  if (expected.kyc_status && row.kyc_status !== expected.kyc_status) {
    return {
      ok: false,
      row,
      error: `Database kyc_status is "${row.kyc_status}", expected "${expected.kyc_status}".`,
    };
  }

  if (expected.owner_status && row.owner_status !== expected.owner_status) {
    return {
      ok: false,
      row,
      error: `Database owner_status is "${row.owner_status}", expected "${expected.owner_status}".`,
    };
  }

  return { ok: true, row };
}

async function updateOwnerProfile(
  userId: string,
  patch: Record<string, unknown>,
  existingProfile?: Record<string, unknown> | null
): Promise<{ data: OwnerProfileRow | null; error: string | null }> {
  const result = await writeOwnerProfile(userId, patch, existingProfile);
  if (result.error || result.rowsAffected === 0) {
    return {
      data: null,
      error: result.error ?? "owner_profiles update affected 0 rows.",
    };
  }
  return { data: result.data, error: null };
}

async function readOwnerProfile(userId: string) {
  const db = createAdminClient();
  return db.from("owner_profiles").select("*").eq("user_id", userId).maybeSingle();
}

async function syncCustomerProfile(userId: string, input: { kyc_status?: string; status?: string }) {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...input,
  };
  if (input.status === "approved") payload.approved_at = new Date().toISOString();
  const { error } = await db.from("customer_profiles").upsert(payload, { onConflict: "user_id" });
  if (error && !error.message.includes("column") && !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }
}

export async function approveOwnerKycAction(
  userId: string
): Promise<ActionResult<{ ownerId: string; kycStatus: "approved" }>> {
  try {
    const { user: adminUser } = await requireRole("admin");
    const db = createAdminClient();

    const { data: profile, error: profileReadError } = await readOwnerProfile(userId);
    if (profileReadError) {
      return { success: false, error: profileReadError.message };
    }

    const profileRow = profile as Record<string, unknown> | null;
    const { data: kyc } = await db
      .from("owner_kyc")
      .select("aadhaar_url, license_url")
      .eq("owner_id", userId)
      .maybeSingle();

    const documents = ownerProfileDocumentsToSet(
      profileRow
        ? {
            user_id: userId,
            aadhaar_document_url: profileRow.aadhaar_document_url
              ? String(profileRow.aadhaar_document_url)
              : null,
            license_document_url: profileRow.license_document_url
              ? String(profileRow.license_document_url)
              : null,
            selfie_document_url: profileRow.selfie_document_url
              ? String(profileRow.selfie_document_url)
              : null,
            address_proof_url: profileRow.address_proof_url
              ? String(profileRow.address_proof_url)
              : null,
            aadhaar_number: null,
            license_number: null,
            kyc_submitted_at: null,
          }
        : null,
      {
        aadhaar: (kyc as { aadhaar_url?: string } | null)?.aadhaar_url,
        license: (kyc as { license_url?: string } | null)?.license_url,
      }
    );

    const approvalError = ownerKycApprovalError(documents);
    if (approvalError) {
      return { success: false, error: approvalError };
    }

    if (!profileRow) {
      return {
        success: false,
        error: "No owner_profiles row found. Owner must upload KYC documents first.",
      };
    }

    const now = new Date().toISOString();
    console.log("[approveOwnerKycAction] before UPDATE", {
      userId,
      kyc_status: "approved",
      owner_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    const writeResult = await updateOwnerProfileOnly(userId, {
      kyc_status: "approved",
      owner_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    if (writeResult.error) {
      return { success: false, error: writeResult.error };
    }

    if (writeResult.rowsAffected === 0) {
      return {
        success: false,
        error: "owner_profiles update affected 0 rows. No matching user_id found.",
      };
    }

    const verified = await verifyOwnerProfileRow(userId, {
      kyc_status: "approved",
      owner_status: "approved",
    });

    if (!verified.ok) {
      console.error("[approveOwnerKycAction] verification failed", verified);
      return {
        success: false,
        error: verified.error ?? "KYC approval could not be verified in database.",
      };
    }

    console.log("[approveOwnerKycAction] success — verified row", verified.row);

    await syncOwnerApprovalToProfile(userId, {
      kyc_status: "approved",
      owner_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    await createNotification({
      recipientId: userId,
      recipientRole: "owner",
      type: "kyc_verified",
      title: "KYC Approved",
      message: "Your owner KYC has been approved.",
      metadata: { userId },
    });

    await logApproval({
      entityType: "owner_kyc",
      entityId: userId,
      action: "approved",
      approvedBy: adminUser.id,
    });

    revalidateAdmin();

    return {
      success: true,
      message: "KYC Approved Successfully",
      data: { ownerId: userId, kycStatus: "approved" },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error approving KYC";
    console.error("[approveOwnerKycAction]", error);
    return { success: false, error: message };
  }
}

export async function rejectOwnerKycAction(userId: string, reason?: string): Promise<ActionResult> {
  try {
    const { user } = await requireRole("admin");
    const { data: profileRow, error: readError } = await readOwnerProfile(userId);
    if (readError) {
      return { success: false, error: readError.message };
    }

    const result = await updateOwnerProfile(
      userId,
      { kyc_status: "rejected" },
      profileRow as Record<string, unknown> | null
    );
    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.kyc_status !== "rejected") {
      return {
        success: false,
        error: `KYC rejection did not persist. Got kyc_status="${result.data.kyc_status}".`,
      };
    }

    await createNotification({
      recipientId: userId,
      recipientRole: "owner",
      type: "kyc_rejected",
      title: "KYC Rejected",
      message: reason ?? "Please re-upload your KYC documents.",
      metadata: { userId },
    });

    await logApproval({
      entityType: "owner_kyc",
      entityId: userId,
      action: "rejected",
      approvedBy: user.id,
      remarks: reason,
    });

    revalidateAdmin();
    return { success: true, message: "Owner KYC rejected." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error rejecting KYC";
    return { success: false, error: message };
  }
}

export async function approveOwnerAction(userId: string): Promise<ActionResult> {
  try {
    const { user: adminUser } = await requireRole("admin");

    const { data: profileRow, error: readError } = await readOwnerProfile(userId);
    if (readError) {
      return { success: false, error: readError.message };
    }

    const kycStatus = (profileRow as { kyc_status?: string } | null)?.kyc_status;
    if (!profileKycIsApproved(kycStatus)) {
      return { success: false, error: "KYC must be approved first (owner_profiles.kyc_status = approved)." };
    }

    const now = new Date().toISOString();
    const result = await updateOwnerProfile(
      userId,
      {
        owner_status: "approved",
        approved_at: now,
        approved_by: adminUser.id,
      },
      profileRow as Record<string, unknown> | null
    );

    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.owner_status !== "approved") {
      return {
        success: false,
        error: `Owner approval did not persist. Got owner_status="${result.data.owner_status}".`,
      };
    }

    await syncOwnerApprovalToProfile(userId, {
      owner_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    await createNotification({
      recipientId: userId,
      recipientRole: "owner",
      type: "owner_approved",
      title: "Owner Approved",
      message: "Your owner account is approved. You can now list vehicles.",
      metadata: { userId },
    });

    await logApproval({
      entityType: "owner",
      entityId: userId,
      action: "approved",
      approvedBy: adminUser.id,
    });

    revalidateAdmin();
    return { success: true, message: "Owner approved successfully." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error approving owner";
    return { success: false, error: message };
  }
}

export async function rejectOwnerAction(userId: string, reason?: string): Promise<ActionResult> {
  try {
    const { user } = await requireRole("admin");
    const { data: profileRow, error: readError } = await readOwnerProfile(userId);
    if (readError) {
      return { success: false, error: readError.message };
    }

    const result = await updateOwnerProfile(
      userId,
      { owner_status: "rejected" },
      profileRow as Record<string, unknown> | null
    );
    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.owner_status !== "rejected") {
      return {
        success: false,
        error: `Owner rejection did not persist. Got owner_status="${result.data.owner_status}".`,
      };
    }

    await syncOwnerApprovalToProfile(userId, { owner_status: "rejected" });

    await createNotification({
      recipientId: userId,
      recipientRole: "owner",
      type: "owner_rejected",
      title: "Owner Rejected",
      message: reason ?? "Your owner account was rejected.",
      metadata: { userId },
    });

    await logApproval({
      entityType: "owner",
      entityId: userId,
      action: "rejected",
      approvedBy: user.id,
      remarks: reason,
    });

    revalidateAdmin();
    return { success: true, message: "Owner rejected." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error rejecting owner";
    return { success: false, error: message };
  }
}

export async function approveCustomerKycAction(userId: string): Promise<ActionResult> {
  const { updateCustomerKycByUserId } = await import("@/server/actions/phase2Admin");
  const result = await updateCustomerKycByUserId(userId, "approved");
  if (!result.success) return result;
  await syncCustomerProfile(userId, { kyc_status: "approved" });
  revalidateAdmin();
  return { success: true, message: "Customer KYC approved." };
}

export async function rejectCustomerKycAction(userId: string, reason?: string): Promise<ActionResult> {
  const { updateCustomerKycByUserId } = await import("@/server/actions/phase2Admin");
  const result = await updateCustomerKycByUserId(userId, "rejected", reason ?? "Rejected by admin");
  if (!result.success) return result;
  await syncCustomerProfile(userId, { kyc_status: "rejected" });
  revalidateAdmin();
  return { success: true, message: "Customer KYC rejected." };
}

export async function approveCustomerAction(userId: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: userRow } = await db.from("users").select("kyc_status").eq("id", userId).maybeSingle();
  const { data: profileRow } = await db
    .from("customer_profiles")
    .select("kyc_status")
    .eq("user_id", userId)
    .maybeSingle();

  const kycStatus =
    (profileRow as { kyc_status?: string } | null)?.kyc_status ??
    (userRow as { kyc_status?: string } | null)?.kyc_status;

  if (!profileKycIsApproved(kycStatus)) {
    return { success: false, error: "KYC must be approved first." };
  }

  await syncCustomerProfile(userId, { status: "approved" });

  await createNotification({
    recipientId: userId,
    recipientRole: "rider",
    type: "customer_approved",
    title: "Account Approved",
    message: "Your customer account is approved. You can book vehicles.",
    metadata: { userId },
  });

  await logApproval({
    entityType: "customer",
    entityId: userId,
    action: "approved",
    approvedBy: user.id,
  });

  revalidateAdmin();
  return { success: true, message: "Customer approved." };
}

export async function rejectCustomerAction(userId: string, reason?: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  await syncCustomerProfile(userId, { status: "rejected" });
  await createNotification({
    recipientId: userId,
    recipientRole: "rider",
    type: "customer_rejected",
    title: "Account Rejected",
    message: reason ?? "Your account was rejected.",
    metadata: { userId },
  });
  await logApproval({
    entityType: "customer",
    entityId: userId,
    action: "rejected",
    approvedBy: user.id,
    remarks: reason,
  });
  revalidateAdmin();
  return { success: true, message: "Customer rejected." };
}

export async function fetchAdminOwnerManagementListAction(): Promise<AdminOwnerManagementRecord[]> {
  await requireRole("admin");
  noStore();
  return getAdminOwnerManagementList();
}

export async function setCustomerBlockedAction(userId: string, blocked: boolean): Promise<ActionResult> {
  const { setUserBlocked } = await import("@/server/actions/marketplaceAdmin");
  const result = await setUserBlocked(userId, blocked);
  revalidateAdmin();
  return result.success
    ? { success: true, message: blocked ? "Customer blocked." : "Customer unblocked." }
    : { success: false, error: result.error };
}
