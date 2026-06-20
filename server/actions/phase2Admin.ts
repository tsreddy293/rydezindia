"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { usersWritePayload } from "@/lib/supabase/users-table";
import { ownerKycApprovalError } from "@/lib/admin/owner-kyc";
import { logApproval } from "@/lib/services/verification";
import { createNotification } from "@/lib/services/notifications";
import { dispatchMessage } from "@/lib/services/messaging";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";
import {
  approveCustomerKyc,
  rejectCustomerKyc,
} from "@/lib/services/customer-kyc";
import { safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

export async function updateCustomerKycStatus(
  id: string,
  status: "verified" | "rejected",
  remarks?: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: kyc, error: loadError } = await db.from("customer_kyc").select("user_id").eq("id", id).single();
  if (loadError) return { success: false, error: loadError.message };

  const userId = (kyc as { user_id: string } | null)?.user_id;
  if (!userId) return { success: false, error: "KYC record not found" };

  try {
    if (status === "verified") {
      await approveCustomerKyc({ userId, reviewedBy: user.id, remarks });
    } else {
      await rejectCustomerKyc({ userId, reviewedBy: user.id, remarks });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "KYC update failed";
    return { success: false, error: message };
  }

  await createNotification({
    recipientId: userId,
    recipientRole: "rider",
    type: status === "verified" ? "kyc_verified" : "kyc_rejected",
    title: status === "verified" ? "KYC Verified" : "KYC Rejected",
    message: remarks ?? (status === "verified" ? "Your identity is verified." : "Please re-upload your documents."),
    metadata: { kycId: id },
  });

  const { data: profile } = await db.from("users").select("mobile, email").eq("id", userId).maybeSingle();
  const mobile = (profile as { mobile?: string } | null)?.mobile;
  const email = (profile as { email?: string } | null)?.email;
  if (mobile) {
    await dispatchMessage({
      channel: "sms",
      recipient: mobile,
      template: status === "verified" ? "kyc_verified" : "kyc_rejected",
    });
  }
  if (email) {
    await dispatchMessage({
      channel: "email",
      recipient: email,
      template: status === "verified" ? "kyc_verified" : "kyc_rejected",
    });
  }

  await logApproval({
    entityType: "customer_kyc",
    entityId: id,
    action: status === "verified" ? "approved" : "rejected",
    approvedBy: user.id,
    remarks,
  });

  revalidatePath("/admin/customer-kyc");
  return { success: true };
}

export async function updateOwnerKycByUserId(
  userId: string,
  status: "approved" | "rejected" | "pending"
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  if (status === "approved") {
    const { data: profile } = await db
      .from("owner_profiles")
      .select("aadhaar_document_url, license_document_url")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: kyc } = await db
      .from("owner_kyc")
      .select("aadhaar_url, license_url")
      .eq("owner_id", userId)
      .maybeSingle();

    const documents = {
      aadhaar:
        (profile as { aadhaar_document_url?: string } | null)?.aadhaar_document_url ??
        (kyc as { aadhaar_url?: string } | null)?.aadhaar_url ??
        "",
      license:
        (profile as { license_document_url?: string } | null)?.license_document_url ??
        (kyc as { license_url?: string } | null)?.license_url ??
        "",
    };

    const approvalError = ownerKycApprovalError(documents);
    if (approvalError) {
      return { success: false, error: approvalError };
    }
  }

  const kycStatus =
    status === "approved" ? "verified" : status === "rejected" ? "rejected" : "pending";
  const ownerKycStatus =
    status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

  const userPayload: Record<string, unknown> = usersWritePayload({
    kyc_status: kycStatus,
    role: "owner",
  });

  let { error: userError } = await db.from("users").update(userPayload).eq("id", userId);

  if (userError?.message?.includes("kyc_status")) {
    delete userPayload.kyc_status;
    ({ error: userError } = await db.from("users").update({ role: "owner" }).eq("id", userId));
  }

  if (userError && !userError.message.includes("kyc_status")) {
    return { success: false, error: userError.message };
  }

  const { data: existing } = await db
    .from("owner_kyc")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (existing) {
    await db
      .from("owner_kyc")
      .update({
        status: ownerKycStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", userId);
  }

  await db.from("owner_profiles").upsert(
    {
      user_id: userId,
      kyc_status: ownerKycStatus,
      owner_status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await createNotification({
    recipientId: userId,
    recipientRole: "owner",
    type: status === "approved" ? "kyc_verified" : status === "rejected" ? "kyc_rejected" : "kyc_pending",
    title:
      status === "approved"
        ? "KYC Verified"
        : status === "rejected"
          ? "KYC Rejected"
          : "KYC Under Review",
    message:
      status === "approved"
        ? "Your owner KYC has been approved."
        : status === "rejected"
          ? "Your owner KYC was rejected. Please update your documents."
          : "Your owner KYC is pending review.",
    metadata: { userId },
  });

  revalidatePath("/admin/kyc");
  revalidatePath("/admin/owners");
  revalidatePath("/admin/owner-management");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateCustomerKycByUserId(
  userId: string,
  status: "approved" | "verified" | "rejected" | "pending",
  remarks?: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const dbStatus = status === "verified" ? "approved" : status;

  try {
    if (dbStatus === "approved") {
      const row = await approveCustomerKyc({ userId, reviewedBy: user.id, remarks });
      const returnPath = safeRiderRedirectPath(
        String((row as { self_drive_return_path?: string } | null)?.self_drive_return_path ?? "")
      );
      await createNotification({
        recipientId: userId,
        recipientRole: "rider",
        type: "kyc_verified",
        title: "KYC Approved",
        message: returnPath
          ? "Your KYC is approved. You can continue your self-drive booking."
          : remarks ?? "Your KYC has been approved.",
        metadata: { userId, returnPath: returnPath ?? undefined },
      });
    } else if (dbStatus === "rejected") {
      await rejectCustomerKyc({ userId, reviewedBy: user.id, remarks });
      await createNotification({
        recipientId: userId,
        recipientRole: "rider",
        type: "kyc_rejected",
        title: "KYC Rejected",
        message: remarks ?? "Please re-upload your documents.",
        metadata: { userId },
      });
    } else {
      const db = createAdminClient();
      const now = new Date().toISOString();
      const { error } = await db
        .from("customer_kyc")
        .upsert(
          {
            user_id: userId,
            status: "pending",
            remarks: remarks ?? null,
            updated_at: now,
          },
          { onConflict: "user_id" }
        );
      if (error) return { success: false, error: error.message };
      await db.from("users").update({ kyc_status: "pending" }).eq("id", userId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "KYC update failed";
    console.error("[updateCustomerKycByUserId]", { userId, status, message });
    return { success: false, error: message };
  }

  if (dbStatus !== "approved" && dbStatus !== "rejected") {
    await createNotification({
      recipientId: userId,
      recipientRole: "rider",
      type: "kyc_pending",
      title: "KYC Under Review",
      message: remarks ?? "Your KYC is pending review.",
      metadata: { userId },
    });
  }

  revalidatePath("/admin/customer-kyc");
  revalidatePath("/admin/customer-management");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kyc");
  return { success: true };
}

export async function requestKycReupload(
  entityType: "owner_kyc" | "customer_kyc",
  id: string,
  reason: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();
  const table = entityType;

  const updatePayload =
    entityType === "owner_kyc"
      ? { reupload_requested: true, reupload_reason: reason, status: "pending" }
      : { status: "rejected", remarks: reason };

  const { data: row } = await db.from(table).select("owner_id, user_id").eq("id", id).single();
  const { error } = await db.from(table).update(updatePayload).eq("id", id);
  if (error) return { success: false, error: error.message };

  const recipientId =
    entityType === "owner_kyc"
      ? (row as { owner_id: string }).owner_id
      : (row as { user_id: string }).user_id;

  await createNotification({
    recipientId,
    recipientRole: entityType === "owner_kyc" ? "owner" : "rider",
    type: "kyc_reupload_requested",
    title: "Re-upload required",
    message: reason || "Please re-upload your documents.",
    metadata: { entityType, id },
  });

  await logApproval({
    entityType,
    entityId: id,
    action: "reupload_requested",
    approvedBy: user.id,
    remarks: reason,
  });

  revalidatePath("/admin/kyc");
  revalidatePath("/admin/customer-kyc");
  return { success: true };
}

export async function approveVehicleDocument(
  vehicleId: string,
  approved: boolean,
  remarks?: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: vehicle, error: fetchError } = await db
    .from("vehicles")
    .select("owner_id, vehicle_make, vehicle_model")
    .eq("id", vehicleId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!vehicle) return { success: false, error: "Vehicle not found" };

  const ownerId = String((vehicle as { owner_id: string }).owner_id);

  if (approved) {
    const { data: userRow } = await db
      .from("users")
      .select("kyc_status")
      .eq("id", ownerId)
      .maybeSingle();
    const { data: profileRow } = await db
      .from("owner_profiles")
      .select("kyc_status")
      .eq("user_id", ownerId)
      .maybeSingle();

    const kycStatus =
      (profileRow as { kyc_status?: string } | null)?.kyc_status ??
      (userRow as { kyc_status?: string } | null)?.kyc_status;

    const { isOwnerKycApproved } = await import("@/lib/admin/marketplace-gates");
    if (!isOwnerKycApproved(kycStatus)) {
      return { success: false, error: "Owner KYC must be approved before document approval." };
    }
  }

  const status = approved ? "approved" : "rejected";
  let { error } = await db
    .from("vehicles")
    .update({
      documents_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error?.message?.includes("documents_status")) {
    return {
      success: false,
      error: "documents_status column missing. Run supabase/RUN_VEHICLE_DOCUMENTS_STATUS.sql in Supabase.",
    };
  }

  if (error) return { success: false, error: error.message };

  await createNotification({
    recipientId: ownerId,
    recipientRole: "owner",
    type: approved ? "vehicle_documents_approved" : "vehicle_documents_rejected",
    title: approved ? "Vehicle documents approved" : "Vehicle documents rejected",
    message: approved
      ? "Your vehicle documents were approved. Vehicle approval can proceed."
      : remarks || "Please re-upload your vehicle documents.",
    metadata: { vehicleId },
  });

  await logApproval({
    entityType: "vehicle_documents",
    entityId: vehicleId,
    action: approved ? "approved" : "rejected",
    approvedBy: user.id,
    remarks,
  });

  revalidatePath("/admin/documents");
  revalidatePath("/admin/vehicles");
  return { success: true };
}

/** @deprecated Use approveVehicleDocument(vehicleId, ...) — vehicle_documents table optional. */
export async function approveVehicleDocumentById(
  documentId: string,
  approved: boolean,
  remarks?: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { error } = await db
    .from("vehicle_documents")
    .update({
      verified: approved,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: approved ? null : remarks ?? "Rejected",
    })
    .eq("id", documentId);

  if (error) return { success: false, error: error.message };

  await logApproval({
    entityType: "vehicle_document",
    entityId: documentId,
    action: approved ? "approved" : "rejected",
    approvedBy: user.id,
    remarks,
  });

  revalidatePath("/admin/documents");
  return { success: true };
}

export async function createCouponAction(input: {
  code: string;
  discountType: "flat" | "percentage";
  discountValue: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
}): Promise<ActionResult<{ id: string }>> {
  await requireRole("admin");
  try {
    const { createCoupon } = await import("@/lib/services/coupons");
    const id = await createCoupon(input);
    revalidatePath("/admin/coupons");
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create coupon" };
  }
}
