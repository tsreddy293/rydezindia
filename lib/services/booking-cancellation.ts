import { createAdminClient } from "@/lib/supabase/admin";
import {
  calculateRefund,
  normalizeBookingTypeForPolicy,
  type RefundCalculationResult,
} from "@/lib/services/cancellation-policy";
import { refundRazorpayPayment } from "@/lib/services/payments";
import { createNotification } from "@/lib/services/notifications";
import type { RefundStatus } from "@/lib/services/cancellation-policy";

export interface BookingCancellationRow {
  id: string;
  user_id: string;
  owner_id?: string | null;
  booking_type?: string | null;
  trip_type?: string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  cancellation_status?: string | null;
  amount?: number | null;
  trip_fare_amount?: number | null;
  security_deposit_amount?: number | null;
  flexible_cancellation?: boolean | null;
  protection_selected?: boolean | null;
  flexible_cancellation_fee?: number | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_trip_fare_amount?: number | null;
  refund_deposit_amount?: number | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  refund_processed_at?: string | null;
  booking_reference?: string | null;
  passenger_name?: string | null;
  ride_id?: string | null;
  seats_booked?: number | null;
}

function tripFarePaid(row: BookingCancellationRow): number {
  const explicit = Number(row.trip_fare_amount ?? 0);
  if (explicit > 0) return explicit;
  return Number(row.amount ?? 0);
}

export function computeBookingRefund(row: BookingCancellationRow, cancelledAt = new Date()): RefundCalculationResult {
  return calculateRefund({
    bookingType: normalizeBookingTypeForPolicy(row.booking_type, row.trip_type),
    tripFareAmount: tripFarePaid(row),
    securityDepositAmount: Number(row.security_deposit_amount ?? 0),
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    cancelledAt,
    flexibleCancellation: Boolean(row.flexible_cancellation || row.protection_selected),
    protectionSelected: Boolean(row.protection_selected || row.flexible_cancellation),
    paymentStatus: row.payment_status,
  });
}

async function releaseReturnJourneySeats(db: ReturnType<typeof createAdminClient>, row: BookingCancellationRow) {
  if (!row.ride_id || !row.seats_booked) return;
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

export async function fetchBookingForCancellation(bookingId: string): Promise<BookingCancellationRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select(
      "id, user_id, owner_id, booking_type, trip_type, booking_status, payment_status, cancellation_status, amount, trip_fare_amount, security_deposit_amount, flexible_cancellation, protection_selected, pickup_date, pickup_time, refund_amount, refund_status, refund_trip_fare_amount, refund_deposit_amount, cancellation_reason, cancelled_at, refund_processed_at, booking_reference, passenger_name, ride_id, seats_booked"
    )
    .eq("id", bookingId)
    .maybeSingle();
  return (data as BookingCancellationRow | null) ?? null;
}

export async function cancelBookingWithRefund(input: {
  bookingId: string;
  reason: string;
  cancelledBy: "user" | "admin" | "owner";
  userId?: string;
}) {
  const db = createAdminClient();
  const row = await fetchBookingForCancellation(input.bookingId);
  if (!row) return { success: false as const, error: "Booking not found" };

  if (input.cancelledBy === "user" && input.userId && row.user_id !== input.userId) {
    return { success: false as const, error: "You can only cancel your own bookings" };
  }

  const alreadyCancelled =
    row.cancellation_status === "cancelled" ||
    String(row.booking_status ?? "").toLowerCase() === "cancelled";
  if (alreadyCancelled) {
    return { success: false as const, error: "Booking is already cancelled" };
  }

  const refund = computeBookingRefund(row);
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    booking_status: "cancelled",
    cancellation_status: "cancelled",
    cancellation_reason: input.reason.trim(),
    cancel_reason: input.reason.trim(),
    cancelled_by: input.cancelledBy,
    cancelled_at: now,
    refund_amount: refund.totalRefundAmount,
    refund_trip_fare_amount: refund.tripFareRefundAmount,
    refund_deposit_amount: refund.securityDepositRefundAmount,
    refund_status: refund.refundEligible && refund.totalRefundAmount > 0 ? "pending" : null,
  };

  const { error } = await db.from("bookings").update(updatePayload).eq("id", input.bookingId);
  if (error) return { success: false as const, error: error.message };

  await releaseReturnJourneySeats(db, row);

  if (row.owner_id) {
    await createNotification({
      recipientId: row.owner_id,
      recipientRole: "owner",
      type: "booking_cancelled",
      title: "Booking cancelled",
      message: `${row.passenger_name ?? "Customer"} cancelled booking ${row.booking_reference ?? input.bookingId.slice(0, 8)}.`,
      metadata: { bookingId: input.bookingId, refundAmount: refund.totalRefundAmount },
    });
  }

  return {
    success: true as const,
    data: { refund, cancelledAt: now },
  };
}

export async function updateRefundStatus(input: {
  bookingId: string;
  status: RefundStatus;
  adminNote?: string;
}) {
  const db = createAdminClient();
  const row = await fetchBookingForCancellation(input.bookingId);
  if (!row) return { success: false as const, error: "Booking not found" };
  if (row.cancellation_status !== "cancelled" && String(row.booking_status) !== "cancelled") {
    return { success: false as const, error: "Booking is not cancelled" };
  }

  const update: Record<string, unknown> = { refund_status: input.status };
  if (input.status === "rejected") {
    update.refund_amount = 0;
    update.refund_trip_fare_amount = 0;
    update.refund_deposit_amount = 0;
  }
  if (input.status === "refunded") {
    update.refund_processed_at = new Date().toISOString();
    update.refunded_at = new Date().toISOString();
    update.payment_status = "refunded";
  }

  const { error } = await db.from("bookings").update(update).eq("id", input.bookingId);
  if (error) return { success: false as const, error: error.message };

  if (row.user_id) {
    const titles: Record<RefundStatus, string> = {
      pending: "Refund pending review",
      approved: "Refund approved",
      processing: "Refund processing",
      refunded: "Refund completed",
      rejected: "Refund rejected",
    };
    await createNotification({
      recipientId: row.user_id,
      recipientRole: "rider",
      type: "refund_update",
      title: titles[input.status],
      message:
        input.status === "rejected"
          ? input.adminNote || "Your refund request was not approved."
          : `Refund status updated to ${input.status}.`,
      metadata: { bookingId: input.bookingId, refundStatus: input.status },
    });
  }

  return { success: true as const };
}

export async function executeApprovedRefund(bookingId: string) {
  const db = createAdminClient();
  const row = await fetchBookingForCancellation(bookingId);
  if (!row) return { success: false as const, error: "Booking not found" };

  const refundAmount = Number(row.refund_amount ?? 0);
  if (refundAmount <= 0) {
    return { success: false as const, error: "No refund amount to process" };
  }

  if (row.refund_status !== "approved") {
    return { success: false as const, error: "Refund must be approved first" };
  }

  await updateRefundStatus({ bookingId, status: "processing" });

  const { data: payment } = await db
    .from("payments")
    .select("id, razorpay_payment_id, amount, status")
    .eq("booking_id", bookingId)
    .eq("status", "captured")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const paymentRow = payment as { id?: string; razorpay_payment_id?: string; amount?: number } | null;
  if (!paymentRow?.razorpay_payment_id) {
    await updateRefundStatus({ bookingId, status: "refunded" });
    return { success: true as const, message: "Refund marked complete (no online payment record)" };
  }

  try {
    const refundPayAmount = Math.min(refundAmount, Number(paymentRow.amount ?? refundAmount));
    await refundRazorpayPayment({
      bookingId,
      paymentId: paymentRow.id!,
      razorpayPaymentId: paymentRow.razorpay_payment_id,
      amount: refundPayAmount,
      reason: row.cancellation_reason ?? "Booking cancellation refund",
    });
    await updateRefundStatus({ bookingId, status: "refunded" });
    return { success: true as const };
  } catch (err) {
    await updateRefundStatus({ bookingId, status: "approved" });
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Refund processing failed",
    };
  }
}

export interface RefundAnalytics {
  totalCancelled: number;
  pendingRefunds: number;
  approvedRefunds: number;
  processingRefunds: number;
  completedRefunds: number;
  rejectedRefunds: number;
  totalRefundAmount: number;
  completedRefundAmount: number;
}

export async function getRefundAnalytics(): Promise<RefundAnalytics> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select("cancellation_status, booking_status, refund_status, refund_amount")
    .or("cancellation_status.eq.cancelled,booking_status.eq.cancelled")
    .limit(500);

  const rows = (data ?? []) as Array<{
    cancellation_status?: string;
    booking_status?: string;
    refund_status?: string;
    refund_amount?: number;
  }>;

  const analytics: RefundAnalytics = {
    totalCancelled: rows.length,
    pendingRefunds: 0,
    approvedRefunds: 0,
    processingRefunds: 0,
    completedRefunds: 0,
    rejectedRefunds: 0,
    totalRefundAmount: 0,
    completedRefundAmount: 0,
  };

  for (const row of rows) {
    const amount = Number(row.refund_amount ?? 0);
    analytics.totalRefundAmount += amount;
    switch (row.refund_status) {
      case "pending":
        analytics.pendingRefunds += 1;
        break;
      case "approved":
        analytics.approvedRefunds += 1;
        break;
      case "processing":
        analytics.processingRefunds += 1;
        break;
      case "refunded":
        analytics.completedRefunds += 1;
        analytics.completedRefundAmount += amount;
        break;
      case "rejected":
        analytics.rejectedRefunds += 1;
        break;
    }
  }

  return analytics;
}

export async function getCancelledBookings(limit = 100) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancellation_reason, cancelled_at, pickup_date, payment_status, protection_selected, flexible_cancellation, flexible_cancellation_fee"
    )
    .or("cancellation_status.eq.cancelled,booking_status.eq.cancelled")
    .order("cancelled_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function getUserRefundHistory(userId: string, limit = 50) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("bookings")
    .select(
      "id, booking_reference, booking_type, amount, refund_amount, refund_status, refund_trip_fare_amount, refund_deposit_amount, cancellation_reason, cancelled_at, refund_processed_at, pickup_date, pickup_time, cancellation_status, booking_status, passenger_name, payment_status, created_at"
    )
    .eq("user_id", userId)
    .or("cancellation_status.eq.cancelled,booking_status.eq.cancelled")
    .order("cancelled_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? [])
    .filter((row) => row.refund_status || String(row.cancellation_status) === "cancelled")
    .map((row) => ({
      id: String(row.id),
      booking_reference: (row.booking_reference as string | null) ?? undefined,
      booking_type: String(row.booking_type ?? "booking"),
      passenger_name: String(row.passenger_name ?? "Passenger"),
      amount: Number(row.amount ?? 0),
      booking_status: String(row.booking_status ?? "cancelled"),
      payment_status: String(row.payment_status ?? "pending"),
      pickup_date: (row.pickup_date as string | null) ?? undefined,
      pickup_time: (row.pickup_time as string | null) ?? undefined,
      created_at: String(row.created_at ?? ""),
      cancellation_status: String(row.cancellation_status ?? "cancelled"),
      cancelled_at: (row.cancelled_at as string | null) ?? undefined,
      refund_amount: Number(row.refund_amount ?? 0),
      refund_status: (row.refund_status as string | null) ?? undefined,
      refund_processed_at: (row.refund_processed_at as string | null) ?? undefined,
      cancellation_reason: (row.cancellation_reason as string | null) ?? undefined,
    }));
}
