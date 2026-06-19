"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerKycApproved } from "@/lib/admin/marketplace-gates";
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

async function syncOwnerProfileKyc(userId: string, kycStatus: "pending" | "approved" | "rejected") {
  const db = createAdminClient();
  const payload = { user_id: userId, kyc_status: kycStatus, updated_at: new Date().toISOString() };
  const { error } = await db.from("owner_profiles").upsert(payload, { onConflict: "user_id" });
  if (error && !error.message.includes("column") && !error.message.includes("does not exist")) {
    console.warn("[syncOwnerProfileKyc]", error.message);
  }
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
    console.warn("[syncOwnerProfileStatus]", error.message);
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
    console.warn("[syncCustomerProfile]", error.message);
  }
}

export async function approveOwnerKycAction(userId: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: profile } = await db
    .from("owner_profiles")
    .select(
      "aadhaar_document_url, license_document_url, selfie_document_url, address_proof_url"
    )
    .eq("user_id", userId)
    .maybeSingle();

  const { data: kyc } = await db
    .from("owner_kyc")
    .select("aadhaar_url, license_url")
    .eq("owner_id", userId)
    .maybeSingle();

  const documents = ownerProfileDocumentsToSet(
    profile
      ? {
          user_id: userId,
          aadhaar_document_url: (profile as { aadhaar_document_url?: string }).aadhaar_document_url ?? null,
          license_document_url: (profile as { license_document_url?: string }).license_document_url ?? null,
          selfie_document_url: null,
          address_proof_url: null,
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
  if (approvalError) return { success: false, error: approvalError };

  await db.from("users").update({ kyc_status: "verified", role: "owner" }).eq("id", userId);
  await syncOwnerProfileKyc(userId, "approved");

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
    approvedBy: user.id,
  });

  revalidateAdmin();
  return { success: true, message: "Owner KYC approved." };
}

export async function rejectOwnerKycAction(userId: string, reason?: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  await db.from("users").update({ kyc_status: "rejected" }).eq("id", userId);
  await syncOwnerProfileKyc(userId, "rejected");

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

  const kycStatus =
    (profileRow as { kyc_status?: string } | null)?.kyc_status ??
    (userRow as { kyc_status?: string } | null)?.kyc_status;

  if (!isOwnerKycApproved(kycStatus)) {
    return { success: false, error: "KYC must be approved first." };
  }

  await db
    .from("users")
    .update({ owner_status: "approved", role: "owner", updated_at: new Date().toISOString() })
    .eq("id", userId);

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

  await db
    .from("users")
    .update({ owner_status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", userId);

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

  await db
    .from("users")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", userId);

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
