"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logApproval } from "@/lib/services/verification";
import { createNotification } from "@/lib/services/notifications";
import { dispatchMessage } from "@/lib/services/messaging";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

export async function updateCustomerKycStatus(
  id: string,
  status: "verified" | "rejected",
  remarks?: string
): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: kyc } = await db.from("customer_kyc").select("user_id").eq("id", id).single();
  const userId = (kyc as { user_id: string } | null)?.user_id;

  const { error } = await db
    .from("customer_kyc")
    .update({
      status,
      remarks: remarks ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (userId) {
    await db.from("users").update({ kyc_status: status }).eq("id", userId);
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
