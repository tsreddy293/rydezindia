"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { createNotification } from "@/lib/services/notifications";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import {
  deriveSelfDrivePaymentSnapshot,
  selfDriveIsFullyPaid,
} from "@/lib/bookings/self-drive-payment";
import type { ActionResult } from "@/types/database";

async function requireOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const role = await getRoleForUser(data.user.id);
  if (role !== "owner") return null;
  return data.user.id;
}

type OwnerBookingRow = {
  id: string;
  owner_id?: string;
  user_id?: string | null;
  booking_status?: string;
  payment_status?: string;
  booking_reference?: string | null;
  passenger_name?: string | null;
  booking_type?: string | null;
  special_instructions?: string | null;
  trip_fare_amount?: number | null;
  security_deposit_amount?: number | null;
  advance_amount?: number | null;
  balance_amount?: number | null;
  amount_paid?: number | null;
  amount_due?: number | null;
};

async function loadOwnerBooking(
  bookingId: string,
  ownerId: string
): Promise<OwnerBookingRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select(
      "id, owner_id, user_id, booking_status, payment_status, booking_reference, passenger_name, booking_type, special_instructions, trip_fare_amount, security_deposit_amount, advance_amount, balance_amount, amount_paid, amount_due"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!data || String((data as OwnerBookingRow).owner_id) !== ownerId) return null;
  return data as OwnerBookingRow;
}

function isSelfDriveBooking(booking: OwnerBookingRow): boolean {
  return String(booking.booking_type ?? "").toLowerCase() === "self_drive";
}

async function notifyRider(
  booking: OwnerBookingRow,
  title: string,
  message: string,
  type: string
) {
  const riderId = String(booking.user_id ?? "").trim();
  if (!riderId) return;
  await createNotification({
    recipientId: riderId,
    recipientRole: "rider",
    type,
    title,
    message,
    metadata: { bookingId: booking.id },
  });
}

export async function ownerApproveBooking(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const booking = await loadOwnerBooking(bookingId, ownerId);
  if (!booking) return { success: false, error: "Booking not found" };

  const status = String(booking.booking_status ?? "").toLowerCase();
  if (isBookingCancelledStatus(status)) {
    return { success: false, error: "Cancelled bookings cannot be approved" };
  }
  if (!["pending", "confirmed"].includes(status)) {
    return { success: false, error: "Booking cannot be approved in its current status" };
  }

  if (isSelfDriveBooking(booking)) {
    const snapshot = deriveSelfDrivePaymentSnapshot(booking as Record<string, unknown>);
    const paymentStatus = String(booking.payment_status ?? "");
    if (!snapshot || !selfDriveIsFullyPaid(paymentStatus, snapshot)) {
      return {
        success: false,
        error: "Customer must complete full payment before owner approval",
      };
    }
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({ booking_status: "owner_confirmed" })
    .eq("id", bookingId)
    .eq("owner_id", ownerId);

  if (error) return { success: false, error: error.message };

  await notifyRider(
    booking,
    "Owner confirmed your booking",
    `Your booking ${booking.booking_reference ?? bookingId.slice(0, 8)} has been confirmed by the owner.`,
    "booking_approved"
  );

  revalidatePath("/owner/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function ownerRejectBooking(bookingId: string, reason?: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const booking = await loadOwnerBooking(bookingId, ownerId);
  if (!booking) return { success: false, error: "Booking not found" };

  const status = String(booking.booking_status ?? "").toLowerCase();
  if (!["pending", "confirmed"].includes(status)) {
    return { success: false, error: "Booking cannot be rejected in its current status" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancel_reason: reason?.trim() || "Rejected by owner",
      cancelled_by: ownerId,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .eq("owner_id", ownerId);

  if (error) return { success: false, error: error.message };

  await notifyRider(
    booking,
    "Booking declined",
    reason?.trim() || "The owner could not accept your booking request.",
    "booking_rejected"
  );

  revalidatePath("/owner/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function ownerStartTrip(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const booking = await loadOwnerBooking(bookingId, ownerId);
  if (!booking) return { success: false, error: "Booking not found" };

  if (isSelfDriveBooking(booking)) {
    const { ownerStartSelfDriveTrip } = await import("@/server/actions/selfDrivePayment");
    return ownerStartSelfDriveTrip(bookingId);
  }

  const status = String(booking.booking_status ?? "").toLowerCase();
  if (!["confirmed", "owner_confirmed", "pending"].includes(status)) {
    return { success: false, error: "Trip cannot be started in its current status" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({ booking_status: "active" })
    .eq("id", bookingId)
    .eq("owner_id", ownerId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/owner/bookings");
  return { success: true };
}

export async function ownerCompleteTrip(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const booking = await loadOwnerBooking(bookingId, ownerId);
  if (!booking) return { success: false, error: "Booking not found" };

  if (isSelfDriveBooking(booking)) {
    const { ownerCompleteSelfDriveTrip } = await import("@/server/actions/selfDrivePayment");
    return ownerCompleteSelfDriveTrip(bookingId);
  }

  const status = String(booking.booking_status ?? "").toLowerCase();
  if (!["active", "confirmed", "owner_confirmed"].includes(status)) {
    return { success: false, error: "Trip cannot be completed in its current status" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({ booking_status: "completed" })
    .eq("id", bookingId)
    .eq("owner_id", ownerId);

  if (error) return { success: false, error: error.message };

  await db
    .from("owner_earnings")
    .update({ status: "settled" })
    .eq("booking_id", bookingId)
    .eq("owner_id", ownerId);

  revalidatePath("/owner/bookings");
  revalidatePath("/owner/earnings");
  return { success: true };
}
