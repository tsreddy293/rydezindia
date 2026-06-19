"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { usersWritePayload } from "@/lib/supabase/users-table";
import { isOwnerKycApproved } from "@/lib/admin/marketplace-gates";
import { resolveOwnerKycAdminStatus } from "@/lib/admin/owner-kyc-status";
import { ownerKycApprovalError } from "@/lib/admin/owner-kyc";
import { ownerProfileDocumentsToSet } from "@/lib/services/owner-profile-kyc";
import { createNotification } from "@/lib/services/notifications";
import { logApproval } from "@/lib/services/verification";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

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

function revalidateAdmin() {
  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}

type OwnerProfileKycUpdate = {
  user_id: string;
  kyc_status: "pending" | "approved" | "rejected";
  kyc_approved_at?: string | null;
  updated_at: string;
};

async function updateOwnerProfileKycStatus(
  userId: string,
  kycStatus: "pending" | "approved" | "rejected",
  existingProfile?: Record<string, unknown> | null
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const db = createAdminClient();
  const now = new Date().toISOString();

  const payload: OwnerProfileKycUpdate = {
    user_id: userId,
    kyc_status: kycStatus,
    updated_at: now,
  };
  if (kycStatus === "approved") payload.kyc_approved_at = now;
  if (kycStatus !== "approved") payload.kyc_approved_at = null;

  console.log("[updateOwnerProfileKycStatus] before update", { userId, payload });

  let { data, error } = await db
    .from("owner_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, kyc_status, kyc_approved_at, updated_at");

  if (error?.message.includes("kyc_approved_at")) {
    const { kyc_approved_at: _removed, ...withoutApprovedAt } = payload;
    ({ data, error } = await db
      .from("owner_profiles")
      .update(withoutApprovedAt)
      .eq("user_id", userId)
      .select("user_id, kyc_status, updated_at"));
  }

  if (error?.message.includes("kyc_status")) {
    return {
      data: null,
      error:
        "owner_profiles.kyc_status column missing. Run supabase/RUN_ADMIN_PROFILE_STATUS.sql in Supabase SQL Editor.",
    };
  }

  if (!error && (!data || data.length === 0)) {
    const upsertPayload: Record<string, unknown> = {
      ...payload,
      ...(existingProfile ?? {}),
      user_id: userId,
    };
    delete upsertPayload.id;

    ({ data, error } = await db
      .from("owner_profiles")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("user_id, kyc_status, kyc_approved_at, updated_at"));
  }

  if (error) {
    console.error("[updateOwnerProfileKycStatus] error", error);
    return { data: null, error: error.message };
  }

  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  console.log("[updateOwnerProfileKycStatus] after update", { userId, row });
  return { data: row, error: null };
}

async function syncOwnerProfileStatus(
  userId: string,
  status: "pending" | "approved" | "rejected"
) {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    user_id: userId,
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "approved") payload.approved_at = new Date().toISOString();
  const { error } = await db.from("owner_profiles").upsert(payload, { onConflict: "user_id" });
  if (error && !error.message.includes("column") && !error.message.includes("does not exist")) {
    console.error("[syncOwnerProfileStatus]", error.message);
    throw new Error(error.message);
  }
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
    console.error("[syncCustomerProfile]", error.message);
    throw new Error(error.message);
  }
}

export async function approveOwnerKycAction(
  userId: string
): Promise<ActionResult<{ ownerId: string; kycStatus: "approved" }>> {
  console.log("[approveOwnerKycAction] Approve KYC clicked", { userId });

  try {
    const { user: adminUser } = await requireRole("admin");
    const db = createAdminClient();

    const { data: profile, error: profileReadError } = await db
      .from("owner_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileReadError) {
      console.error("[approveOwnerKycAction] profile read error", profileReadError);
      return { success: false, error: profileReadError.message };
    }

    const { data: kyc } = await db
      .from("owner_kyc")
      .select("aadhaar_url, license_url")
      .eq("owner_id", userId)
      .maybeSingle();

    const profileRow = profile as Record<string, unknown> | null;
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
      console.error("[approveOwnerKycAction] document validation failed", approvalError);
      return { success: false, error: approvalError };
    }

    console.log("[approveOwnerKycAction] before users update", { userId });

    let { data: userRows, error: userError } = await db
      .from("users")
      .update(usersWritePayload({ kyc_status: "verified", role: "owner" }))
      .eq("id", userId)
      .select("id, kyc_status");

    if (userError?.message.includes("kyc_status")) {
      ({ data: userRows, error: userError } = await db
        .from("users")
        .update({ role: "owner" })
        .eq("id", userId)
        .select("id"));
    }

    if (userError) {
      console.error("[approveOwnerKycAction] users update error", userError);
      return { success: false, error: `users table: ${userError.message}` };
    }

    if (!userRows?.length) {
      const { data: authData } = await db.auth.admin.getUserById(userId);
      const authUser = authData.user;
      if (!authUser) {
        return { success: false, error: "Owner user not found in auth or public.users." };
      }
      const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
      const { error: upsertError } = await db.from("users").upsert({
        id: userId,
        email: authUser.email ?? "",
        name: String(meta.name ?? meta.full_name ?? "Owner"),
        mobile: String(meta.mobile ?? ""),
        role: "owner",
        kyc_status: "verified",
      });
      if (upsertError) {
        console.error("[approveOwnerKycAction] users upsert error", upsertError);
        return { success: false, error: `users upsert: ${upsertError.message}` };
      }
    }

    console.log("[approveOwnerKycAction] users updated", { userRows });

    const profileResult = await updateOwnerProfileKycStatus(userId, "approved", profileRow);
    if (profileResult.error) {
      return { success: false, error: `owner_profiles: ${profileResult.error}` };
    }

    const { error: legacyKycError } = await db
      .from("owner_kyc")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("owner_id", userId);
    if (legacyKycError && !legacyKycError.message.includes("does not exist")) {
      console.warn("[approveOwnerKycAction] owner_kyc sync warning", legacyKycError.message);
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
    console.log("[approveOwnerKycAction] success", {
      userId,
      profile: profileResult.data,
    });

    return {
      success: true,
      message: "KYC Approved Successfully",
      data: { ownerId: userId, kycStatus: "approved" },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error approving KYC";
    console.error("[approveOwnerKycAction] exception", error);
    return { success: false, error: message };
  }
}

export async function rejectOwnerKycAction(userId: string, reason?: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { error: userError } = await db
    .from("users")
    .update({ kyc_status: "rejected" })
    .eq("id", userId);
  if (userError) {
    console.error("[rejectOwnerKycAction] users error", userError);
    return { success: false, error: userError.message };
  }

  const profileResult = await updateOwnerProfileKycStatus(userId, "rejected");
  if (profileResult.error) {
    return { success: false, error: profileResult.error };
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
}

export async function approveOwnerAction(userId: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: userRow } = await db
    .from("users")
    .select("kyc_status, owner_status")
    .eq("id", userId)
    .maybeSingle();

  const { data: profileRow } = await db
    .from("owner_profiles")
    .select("kyc_status")
    .eq("user_id", userId)
    .maybeSingle();

  const kycStatus = resolveOwnerKycAdminStatus({
    profileKyc: (profileRow as { kyc_status?: string } | null)?.kyc_status,
    userKyc: (userRow as { kyc_status?: string } | null)?.kyc_status,
  });

  if (!isOwnerKycApproved(kycStatus)) {
    return { success: false, error: "KYC must be approved first." };
  }

  const { error: updateError } = await db
    .from("users")
    .update(usersWritePayload({ owner_status: "approved", role: "owner" }))
    .eq("id", userId);

  if (updateError) {
    console.error("[approveOwnerAction] users error", updateError);
    return { success: false, error: updateError.message };
  }

  await syncOwnerProfileStatus(userId, "approved");

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
    approvedBy: user.id,
  });

  revalidateAdmin();
  return { success: true, message: "Owner approved." };
}

export async function rejectOwnerAction(userId: string, reason?: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { error } = await db
    .from("users")
    .update({ owner_status: "rejected" })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  await syncOwnerProfileStatus(userId, "rejected");

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

  if (!isOwnerKycApproved(kycStatus)) {
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

export async function setCustomerBlockedAction(userId: string, blocked: boolean): Promise<ActionResult> {
  const { setUserBlocked } = await import("@/server/actions/marketplaceAdmin");
  const result = await setUserBlocked(userId, blocked);
  revalidateAdmin();
  return result.success
    ? { success: true, message: blocked ? "Customer blocked." : "Customer unblocked." }
    : { success: false, error: result.error };
}
