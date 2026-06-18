"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/services/notifications";
import { publishVehicleToMarketplace, unpublishVehicleFromMarketplace } from "@/lib/services/vehicle-onboarding";
import { requireRole } from "@/server/actions/auth";
import type { UserRole } from "@/types/database";

type ListingTable = "vehicles" | "return_journeys" | "driver_vehicles" | "self_drive_vehicles";

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

  await createNotification({
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
  await createNotification({
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

  let { error } = await db
    .from("users")
    .update({ kyc_status: kycStatus })
    .eq("id", ownerId);

  if (error?.message?.includes("kyc_status")) {
    ({ error } = await db.from("users").update({ role: "owner" }).eq("id", ownerId));
  }

  if (error) return { success: false, error: error.message };
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
  }
  revalidatePath("/admin");
  revalidatePath("/admin/owners");
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
  return { success: true };
}

export async function cancelBooking(input: {
  bookingId: string;
  reason: string;
  cancelledBy: UserRole;
}) {
  await requireRole(input.cancelledBy === "admin" ? "admin" : input.cancelledBy);
  const db = createAdminClient();
  const { data: booking } = await db
    .from("bookings")
    .select("id, ride_id, seats_booked, booking_type, user_id, owner_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  const { error } = await db
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancel_reason: input.reason,
      cancelled_by: input.cancelledBy,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId);

  if (error) return { success: false, error: error.message };

  const row = booking as { ride_id?: string; seats_booked?: number; user_id?: string; owner_id?: string } | null;
  if (row?.ride_id && row.seats_booked) {
    const { data: journey } = await db
      .from("return_journeys")
      .select("available_seats")
      .eq("id", row.ride_id)
      .maybeSingle();
    const available = Number((journey as { available_seats?: number } | null)?.available_seats ?? 0);
    await db
      .from("return_journeys")
      .update({ available_seats: available + Number(row.seats_booked), status: "available" })
      .eq("id", row.ride_id);
  }

  await createNotification({
    recipientId: row?.user_id,
    recipientRole: "rider",
    type: "booking_cancelled",
    title: "Booking cancelled",
    message: input.reason || "A booking has been cancelled.",
    metadata: { bookingId: input.bookingId, cancelledBy: input.cancelledBy },
  });

  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  revalidatePath("/booking/confirmation/[id]");
  return { success: true };
}
