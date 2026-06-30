"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleForUser } from "@/lib/auth/get-role-for-user";
import { createNotification } from "@/lib/services/notifications";
import {
  appendSelfDriveOperationalStage,
  appendSelfDrivePaymentMarker,
  deriveSelfDrivePaymentSnapshot,
  selfDriveAllowsTripStart,
  selfDriveAllowsVehicleHandover,
  selfDriveRequiresBalancePayment,
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

async function loadSelfDriveBooking(bookingId: string, ownerId: string) {
  const db = createAdminClient();
  const { data } = await db.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!data || String((data as { owner_id?: string }).owner_id) !== ownerId) return null;
  if (String((data as { booking_type?: string }).booking_type ?? "").toLowerCase() !== "self_drive") {
    return null;
  }
  return data as Record<string, unknown>;
}

export async function ownerCollectSelfDriveBalance(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const row = await loadSelfDriveBooking(bookingId, ownerId);
  if (!row) return { success: false, error: "Booking not found" };

  const snapshot = deriveSelfDrivePaymentSnapshot(row);
  if (!snapshot) return { success: false, error: "Payment snapshot missing" };

  const paymentStatus = String(row.payment_status ?? "");
  const bookingStatus = String(row.booking_status ?? "");

  if (bookingStatus.toLowerCase() !== "confirmed") {
    return { success: false, error: "Booking must be confirmed before collecting balance" };
  }

  if (!selfDriveRequiresBalancePayment(paymentStatus, snapshot)) {
    return { success: false, error: "No remaining balance to collect" };
  }

  const balanceDue = snapshot.amountDue;
  const newAmountPaid = snapshot.amountPaid + balanceDue;
  const updatedSnapshot = {
    ...snapshot,
    amountPaid: newAmountPaid,
    amountDue: 0,
  };

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      payment_status: "paid",
      amount_paid: newAmountPaid,
      amount_due: 0,
      balance_amount: snapshot.balanceAmount,
      special_instructions: appendSelfDrivePaymentMarker(
        String(row.special_instructions ?? ""),
        updatedSnapshot
      ),
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };

  const riderId = String(row.user_id ?? "").trim();
  if (riderId) {
    await createNotification({
      recipientId: riderId,
      recipientRole: "rider",
      type: "balance_collected",
      title: "Balance payment received",
      message: `Remaining balance of ₹${balanceDue} was collected at vehicle pickup.`,
      metadata: { bookingId, amount: balanceDue },
    });
  }

  revalidatePath("/owner/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true, data: { amountCollected: balanceDue } };
}

export async function ownerHandoverVehicle(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const row = await loadSelfDriveBooking(bookingId, ownerId);
  if (!row) return { success: false, error: "Booking not found" };

  const snapshot = deriveSelfDrivePaymentSnapshot(row)!;
  const paymentStatus = String(row.payment_status ?? "");
  const bookingStatus = String(row.booking_status ?? "");

  if (!selfDriveAllowsVehicleHandover(paymentStatus, bookingStatus, snapshot)) {
    return {
      success: false,
      error: "Full payment required (payment_status must be paid) before vehicle handover",
    };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      special_instructions: appendSelfDriveOperationalStage(
        String(row.special_instructions ?? ""),
        "handed_over",
        { ...snapshot, operationalStage: "handed_over" }
      ),
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/owner/bookings");
  return { success: true };
}

export async function ownerStartSelfDriveTrip(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const row = await loadSelfDriveBooking(bookingId, ownerId);
  if (!row) return { success: false, error: "Booking not found" };

  const snapshot = deriveSelfDrivePaymentSnapshot(row)!;
  if (!selfDriveAllowsTripStart(String(row.payment_status ?? ""), snapshot)) {
    return { success: false, error: "Vehicle handover required before trip start" };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      special_instructions: appendSelfDriveOperationalStage(
        String(row.special_instructions ?? ""),
        "trip_started",
        { ...snapshot, operationalStage: "trip_started" }
      ),
    })
    .eq("id", bookingId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/owner/bookings");
  return { success: true };
}

export async function ownerCompleteSelfDriveTrip(bookingId: string): Promise<ActionResult> {
  const ownerId = await requireOwnerId();
  if (!ownerId) return { success: false, error: "Unauthorized" };

  const row = await loadSelfDriveBooking(bookingId, ownerId);
  if (!row) return { success: false, error: "Booking not found" };

  const snapshot = deriveSelfDrivePaymentSnapshot(row)!;
  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({
      special_instructions: appendSelfDriveOperationalStage(
        String(row.special_instructions ?? ""),
        "trip_completed",
        { ...snapshot, operationalStage: "trip_completed" }
      ),
    })
    .eq("id", bookingId);

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

export async function processSelfDriveDepositRefund(input: {
  bookingId: string;
  damageCharges?: number;
  approvedBy: "owner" | "admin";
}): Promise<ActionResult> {
  const db = createAdminClient();
  const { data } = await db.from("bookings").select("*").eq("id", input.bookingId).maybeSingle();
  if (!data) return { success: false, error: "Booking not found" };

  const row = data as Record<string, unknown>;
  if (String(row.booking_type ?? "").toLowerCase() !== "self_drive") {
    return { success: false, error: "Not a self-drive booking" };
  }

  const snapshot = deriveSelfDrivePaymentSnapshot(row);
  if (!snapshot) return { success: false, error: "Payment snapshot missing" };

  const damage = Math.max(0, Math.round(input.damageCharges ?? 0));
  const refundAmount = Math.max(0, snapshot.securityDeposit - damage);

  const updatedSnapshot = {
    ...snapshot,
    depositRefundAmount: refundAmount,
    depositRefundStatus: (refundAmount > 0 ? "processing" : "refunded") as "processing" | "refunded",
    damageCharges: damage,
  };

  await db
    .from("bookings")
    .update({
      deposit_refund_amount: refundAmount,
      deposit_refund_status: refundAmount > 0 ? "processing" : "refunded",
      special_instructions: appendSelfDrivePaymentMarker(
        String(row.special_instructions ?? ""),
        updatedSnapshot
      ),
    })
    .eq("id", input.bookingId);

  const riderId = String(row.user_id ?? "").trim();
  if (riderId) {
    await createNotification({
      recipientId: riderId,
      recipientRole: "rider",
      type: "deposit_refund",
      title: "Deposit refund processing",
      message:
        damage > 0
          ? `Deposit refund of ₹${refundAmount} after ₹${damage} damage charges.`
          : `Full deposit refund of ₹${refundAmount} is being processed.`,
      metadata: { bookingId: input.bookingId, refundAmount, damageCharges: damage },
    });
  }

  if (refundAmount > 0 && riderId) {
    const { creditWallet } = await import("@/lib/services/wallet");
    await creditWallet({
      userId: riderId,
      amount: refundAmount,
      source: "deposit_refund",
      referenceId: input.bookingId,
      description: `Security deposit refund for booking ${String(row.booking_reference ?? input.bookingId)}`,
    });
  }

  await db
    .from("bookings")
    .update({
      payment_status: "refunded",
      booking_status: "completed",
      deposit_refund_status: "refunded",
    })
    .eq("id", input.bookingId);

  revalidatePath("/owner/bookings");
  revalidatePath("/admin/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true, data: { refundAmount, damageCharges: damage } };
}
