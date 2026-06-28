"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { usersWritePayload } from "@/lib/supabase/users-table";
import { createNotification } from "@/lib/services/notifications";
import { syncOwnerApprovalToProfile } from "@/lib/services/owner-approval-sync";
import { publishVehicleToMarketplace, unpublishVehicleFromMarketplace } from "@/lib/services/vehicle-onboarding";
import { requireRole } from "@/server/actions/auth";
import type { UserRole } from "@/types/database";

type ListingTable = "vehicles" | "return_journeys" | "driver_vehicles" | "self_drive_vehicles";

async function resolveListingOwnerId(table: ListingTable, id: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from(table).select("owner_id").eq("id", id).maybeSingle();
  const ownerId = (data as { owner_id?: string } | null)?.owner_id;
  return ownerId ? String(ownerId) : null;
}

export async function approveVehicle(table: ListingTable, id: string) {
  const { user } = await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from(table)
    .update({
      vehicle_approval_status: "approved",
      status: "available",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (table === "vehicles") {
    try {
      await publishVehicleToMarketplace(id);
    } catch {
      /* listing sync best-effort */
    }
  }

  const ownerId = await resolveListingOwnerId(table, id);

  await createNotification({
    recipientId: ownerId ?? undefined,
    recipientRole: "owner",
    actorId: user.id,
    actorRole: "admin",
    type: "vehicle_approved",
    title: "Vehicle approved",
    message: "Your vehicle listing has been approved and can now receive bookings.",
    metadata: { table, id },
  });
  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  return { success: true };
}

export async function rejectVehicle(table: ListingTable, id: string, reason: string) {
  const { user } = await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from(table)
    .update({
      vehicle_approval_status: "rejected",
      status: "unavailable",
      rejection_reason: reason || "Rejected by admin",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (table === "vehicles") {
    await unpublishVehicleFromMarketplace(id);
  }

  revalidatePath("/admin");
  const ownerId = await resolveListingOwnerId(table, id);
  await createNotification({
    recipientId: ownerId ?? undefined,
    recipientRole: "owner",
    actorId: user.id,
    actorRole: "admin",
    type: "vehicle_rejected",
    title: "Vehicle rejected",
    message: reason || "Your vehicle listing has been rejected.",
    metadata: { table, id },
  });
  return { success: true };
}

export async function updateOwnerStatus(ownerId: string, status: "approved" | "rejected" | "pending") {
  const { user } = await requireRole("admin");
  const db = createAdminClient();
  const kycStatus =
    status === "approved" ? "verified" : status === "rejected" ? "rejected" : "pending";

  const payload: Record<string, unknown> = usersWritePayload({
    owner_status: status,
    role: "owner",
    kyc_status: kycStatus,
  });

  let { data: updatedRows, error } = await db
    .from("users")
    .update(payload)
    .eq("id", ownerId)
    .select("id");

  if (error?.message?.includes("owner_status")) {
    delete payload.owner_status;
    ({ data: updatedRows, error } = await db.from("users").update(payload).eq("id", ownerId).select("id"));
  }

  if (error) return { success: false, error: error.message };

  const updated = (updatedRows?.length ?? 0) > 0;
  if (!updated) {
    const { data: authData } = await db.auth.admin.getUserById(ownerId);
    const authUser = authData.user;
    if (!authUser) {
      return { success: false, error: "Owner account not found" };
    }
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const upsertPayload: Record<string, unknown> = {
      id: ownerId,
      email: authUser.email ?? "",
      name: String(meta.name ?? meta.full_name ?? "Owner"),
      mobile: String(meta.mobile ?? ""),
      role: "owner",
      owner_status: status,
      kyc_status: kycStatus,
    };
    const upsertResult = await db.from("users").upsert(upsertPayload);
    if (upsertResult.error?.message?.includes("owner_status")) {
      delete upsertPayload.owner_status;
      const retry = await db.from("users").upsert(upsertPayload);
      if (retry.error) return { success: false, error: retry.error.message };
    } else if (upsertResult.error) {
      return { success: false, error: upsertResult.error.message };
    }
  }

  if (status === "approved") {
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      actorId: user.id,
      actorRole: "admin",
      type: "owner_approved",
      title: "Owner profile approved",
      message: "Your owner profile has been approved.",
    });
  } else if (status === "rejected") {
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      actorId: user.id,
      actorRole: "admin",
      type: "owner_rejected",
      title: "Owner profile rejected",
      message: "Your owner profile was rejected. Contact support for details.",
    });
  }

  await syncOwnerApprovalToProfile(ownerId, {
    owner_status: status,
    kyc_status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
    ...(status === "approved"
      ? { approved_at: new Date().toISOString(), approved_by: user.id }
      : {}),
  });

  revalidatePath("/admin");
  revalidatePath("/admin/owners");
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/owner-management");
  revalidatePath("/admin/vehicles");
  revalidatePath("/search-self-drive");
  return { success: true };
}

export async function setUserBlocked(userId: string, blocked: boolean) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db.from("users").update({ is_blocked: blocked }).eq("id", userId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  await requireRole("admin");
  const db = createAdminClient();
  await db.from("users").delete().eq("id", userId);
  await db.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function setVehicleEnabled(table: ListingTable, id: string, enabled: boolean) {
  await requireRole("admin");
  const db = createAdminClient();
  const { error } = await db
    .from(table)
    .update({
      status: enabled ? "available" : "unavailable",
      disabled_at: enabled ? null : new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/vehicles");
  return { success: true };
}

export async function updateKycStatus(id: string, status: "approved" | "rejected", remarks?: string) {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: kyc } = await db.from("owner_kyc").select("owner_id").eq("id", id).single();
  const ownerId = (kyc as { owner_id: string } | null)?.owner_id;

  const { error } = await db
    .from("owner_kyc")
    .update({
      status,
      remarks: remarks || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  if (ownerId && status === "approved") {
    await db.from("owners").update({ kyc_verified: true }).eq("id", ownerId);
    await syncOwnerApprovalToProfile(ownerId, {
      kyc_status: "approved",
      owner_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    });
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      actorId: user.id,
      actorRole: "admin",
      type: "kyc_verified",
      title: "KYC Verified",
      message: "Your owner KYC is verified. You can now receive bookings.",
      metadata: { kycId: id },
    });
  } else if (ownerId) {
    await db.from("owners").update({ kyc_verified: false }).eq("id", ownerId);
    await syncOwnerApprovalToProfile(ownerId, { kyc_status: status });
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "kyc_rejected",
      title: "KYC Rejected",
      message: remarks || "Please re-upload your documents.",
      metadata: { kycId: id },
    });
  }

  revalidatePath("/admin/kyc");
  revalidatePath("/admin/owner-management");
  revalidatePath("/admin/vehicles");
  revalidatePath("/search-self-drive");
  return { success: true };
}

import { cancelBookingWithRefund, type CancellationActorRole } from "@/lib/services/booking-cancellation";

export async function cancelBooking(input: {
  bookingId: string;
  reason: string;
  cancelledBy: UserRole;
}) {
  const requiredRole = input.cancelledBy === "admin" ? "admin" : input.cancelledBy === "owner" ? "owner" : "user";
  const { user } = await requireRole(requiredRole);

  const cancelledByRole: CancellationActorRole =
    input.cancelledBy === "admin" ? "admin" : input.cancelledBy === "owner" ? "owner" : "rider";

  const result = await cancelBookingWithRefund({
    bookingId: input.bookingId,
    reason: input.reason,
    actorUserId: user.id,
    cancelledByRole,
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/refunds");
  revalidatePath("/owner/dashboard");
  revalidatePath("/user/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}
