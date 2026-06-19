"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileKycIsApproved } from "@/lib/admin/owner-profile-fields";
import { ownerKycApprovalError } from "@/lib/admin/owner-kyc";
import { ownerProfileDocumentsToSet } from "@/lib/services/owner-profile-kyc";
import { createNotification } from "@/lib/services/notifications";
import { logApproval } from "@/lib/services/verification";
import { requireRole } from "@/server/actions/auth";
import { getAdminOwnerManagementList } from "@/lib/supabase/queries";
import type { ActionResult, AdminOwnerManagementRecord } from "@/types/database";

const ADMIN_PATHS = [
  "/admin",
  "/admin/owner-management",
  "/admin/customer-management",
  "/admin/vehicles",
  "/admin/documents",
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
};

async function updateOwnerProfile(
  userId: string,
  patch: Record<string, unknown>
): Promise<{ data: OwnerProfileRow | null; error: string | null }> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const payload = { ...patch, updated_at: now };

  let { data, error } = await db
    .from("owner_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, kyc_status, owner_status, approved_at, approved_by");

  if (!error && (!data || data.length === 0)) {
    ({ data, error } = await db
      .from("owner_profiles")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
      .select("user_id, kyc_status, owner_status, approved_at, approved_by"));
  }

  if (error) {
    console.error("[updateOwnerProfile]", error);
    return { data: null, error: error.message };
  }

  const row = (data?.[0] ?? null) as OwnerProfileRow | null;
  if (!row) {
    return { data: null, error: "owner_profiles row was not created or updated." };
  }

  return { data: row, error: null };
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

    const now = new Date().toISOString();
    const result = await updateOwnerProfile(userId, {
      kyc_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.kyc_status !== "approved") {
      return {
        success: false,
        error: `KYC update did not persist. Got kyc_status="${result.data.kyc_status}".`,
      };
    }

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

    const result = await updateOwnerProfile(userId, { kyc_status: "rejected" });
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
    const result = await updateOwnerProfile(userId, {
      owner_status: "approved",
      approved_at: now,
      approved_by: adminUser.id,
    });

    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.owner_status !== "approved") {
      return {
        success: false,
        error: `Owner approval did not persist. Got owner_status="${result.data.owner_status}".`,
      };
    }

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

    const result = await updateOwnerProfile(userId, { owner_status: "rejected" });
    if (result.error || !result.data) {
      return { success: false, error: result.error ?? "Failed to update owner_profiles." };
    }

    if (result.data.owner_status !== "rejected") {
      return {
        success: false,
        error: `Owner rejection did not persist. Got owner_status="${result.data.owner_status}".`,
      };
    }

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
  const result = await updateCustomerKycByUserId(userId, "verified");
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
