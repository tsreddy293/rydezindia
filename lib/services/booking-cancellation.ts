import { createAdminClient } from "@/lib/supabase/admin";
import {
  BOOKING_CANCELLATION_COLUMN_SETS,
  BOOKING_CANCELLED_LIST_COLUMN_SETS,
  deriveProtectionFields,
  selectBookingsWithFilter,
} from "@/lib/bookings/booking-select";
import {
  bookingOwnedByUser,
  fetchBookingForCancellation,
} from "@/lib/bookings/fetch-booking-for-cancellation";
import { applyBookingUpdateWithColumnFallback } from "@/lib/bookings/apply-booking-update";
import {
  canRiderCancelBeforeOwnerApproval,
  riderCancelIneligibilityReason,
} from "@/lib/bookings/cancellation-eligibility";
import {
  calculateRefund,
  normalizeBookingTypeForPolicy,
  type RefundCalculationResult,
} from "@/lib/services/cancellation-policy";
import { cancelOwnerEarningsForBooking, refundRazorpayPayment } from "@/lib/services/payments";
import { createNotification } from "@/lib/services/notifications";
import type { RefundStatus } from "@/lib/services/cancellation-policy";
import type { CancellationReasonCategory } from "@/lib/services/cancellation-reasons";
import {
  isRiderPaymentCompleted,
} from "@/lib/bookings/my-bookings-utils";

export interface BookingCancellationRow {
  id: string;
  user_id?: string | null;
  owner_id?: string | null;
  booking_type?: string | null;
  trip_type?: string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  amount?: number | null;
  trip_fare_amount?: number | null;
  security_deposit_amount?: number | null;
  protection_selected?: boolean | null;
  protection_fee?: number | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  refund_trip_fare_amount?: number | null;
  refund_deposit_amount?: number | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_role?: string | null;
  refund_processed_at?: string | null;
  booking_reference?: string | null;
  passenger_name?: string | null;
  ride_id?: string | null;
  seats_booked?: number | null;
  vehicle_id?: string | null;
  reference_id?: string | null;
  mobile?: string | null;
}

function tripFarePaid(row: BookingCancellationRow): number {
  const explicit = Number(row.trip_fare_amount ?? 0);
  if (explicit > 0) return explicit;
  return Number(row.amount ?? 0);
}

function bookingAmountPaid(row: BookingCancellationRow): number {
  return Math.max(0, Math.round(Number(row.amount ?? 0)));
}

export function computeBookingRefund(row: BookingCancellationRow, cancelledAt = new Date()): RefundCalculationResult {
  const bookingAmount = bookingAmountPaid(row);
  if (!isRiderPaymentCompleted(row.payment_status)) {
    return {
      tripFareRefundPercent: 0,
      securityDepositRefundPercent: 0,
      tripFareRefundAmount: 0,
      securityDepositRefundAmount: 0,
      totalRefundAmount: 0,
      bookingAmount,
      cancellationCharges: 0,
      afterScheduledStart: false,
      policyTier: "No payment received",
      flexibleApplied: false,
      refundEligible: false,
    };
  }

  return calculateRefund({
    bookingType: normalizeBookingTypeForPolicy(row.booking_type, row.trip_type),
    tripFareAmount: tripFarePaid(row),
    securityDepositAmount: Number(row.security_deposit_amount ?? 0),
    bookingAmount,
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    cancelledAt,
    protectionSelected: Boolean(row.protection_selected),
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

async function releaseVehicleAvailability(
  db: ReturnType<typeof createAdminClient>,
  row: BookingCancellationRow
) {
  const ids = [row.vehicle_id, row.reference_id].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;

  for (const id of ids) {
    await db
      .from("vehicles")
      .update({ status: "available", availability: "available" })
      .eq("id", id);
    await db
      .from("self_drive_vehicles")
      .update({ status: "available", availability: "available" })
      .eq("id", id);
    await db
      .from("driver_vehicles")
      .update({ status: "available", availability: "available" })
      .eq("id", id);
  }
}

export { fetchBookingForCancellation } from "@/lib/bookings/fetch-booking-for-cancellation";

export type CancellationActorRole = "rider" | "user" | "admin" | "owner";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCancelledByRole(role: CancellationActorRole): "rider" | "admin" | "owner" {
  if (role === "admin") return "admin";
  if (role === "owner") return "owner";
  return "rider";
}

function cancellationLogActorRole(role: CancellationActorRole): "user" | "admin" | "owner" {
  const normalized = normalizeCancelledByRole(role);
  return normalized === "rider" ? "user" : normalized;
}

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function isMissingTableError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("could not find the table") || msg.includes("does not exist");
}

async function insertCancellationLog(
  db: ReturnType<typeof createAdminClient>,
  input: {
    bookingId: string;
    userId?: string | null;
    cancelledByRole: CancellationActorRole;
    reasonCategory?: string | null;
    reason: string;
    refund: RefundCalculationResult;
  }
) {
  const { error } = await db.from("cancellation_logs").insert({
    booking_id: input.bookingId,
    user_id: input.userId ?? null,
    cancelled_by: cancellationLogActorRole(input.cancelledByRole),
    reason_category: input.reasonCategory ?? null,
    reason: input.reason,
    booking_amount: input.refund.bookingAmount,
    cancellation_charges: input.refund.cancellationCharges,
    refund_amount: input.refund.totalRefundAmount,
    policy_tier: input.refund.policyTier,
    refund_trip_fare_amount: input.refund.tripFareRefundAmount,
    refund_deposit_amount: input.refund.securityDepositRefundAmount,
    metadata: {
      tripFareRefundPercent: input.refund.tripFareRefundPercent,
      flexibleApplied: input.refund.flexibleApplied,
    },
  });

  if (error && !isMissingTableError(error)) {
    console.warn("[insertCancellationLog]", error.message);
  }
}

async function insertBookingActivityLog(
  db: ReturnType<typeof createAdminClient>,
  input: {
    bookingId: string;
    eventType: string;
    actorUserId?: string | null;
    actorRole?: string | null;
    reason?: string | null;
    clientIp?: string | null;
  }
) {
  const { error } = await db.from("booking_activity_logs").insert({
    booking_id: input.bookingId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? null,
    reason: input.reason ?? null,
    ip_address: input.clientIp ?? null,
    metadata: {},
  });

  if (error && !isMissingTableError(error)) {
    console.warn("[insertBookingActivityLog]", error.message);
  }
}

async function createPendingRefundRecord(
  db: ReturnType<typeof createAdminClient>,
  bookingId: string,
  refundAmount: number,
  reason: string
) {
  if (refundAmount <= 0) return;

  const { data: payment } = await db
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .in("status", ["captured", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db.from("refunds").insert({
    payment_id: (payment as { id?: string } | null)?.id ?? null,
    booking_id: bookingId,
    amount: refundAmount,
    status: "created",
    reason,
    metadata: { source: "customer_cancellation", pending: true },
  });

  if (error && !isMissingTableError(error)) {
    console.warn("[createPendingRefundRecord]", error.message);
  }
}

export async function cancelBookingWithRefund(input: {
  bookingId: string;
  reason: string;
  reasonCategory?: CancellationReasonCategory | string;
  /** Authenticated user UUID — stored in bookings.cancelled_by */
  actorUserId: string;
  /** Actor role label — stored in bookings.cancelled_by_role */
  cancelledByRole: CancellationActorRole;
  clientIp?: string | null;
}) {
  const normalizedId = String(input.bookingId ?? "").trim();
  const actorUserId = String(input.actorUserId ?? "").trim();
  console.log("[cancelBookingWithRefund] bookingId:", normalizedId, "actorUserId:", actorUserId);

  if (!isValidUuid(actorUserId)) {
    return { success: false as const, error: "Authenticated user required to cancel booking" };
  }

  const db = createAdminClient();
  const row = await fetchBookingForCancellation(normalizedId);
  if (!row) return { success: false as const, error: "Booking not found" };

  const customerCancelled =
    input.cancelledByRole === "user" || input.cancelledByRole === "rider";
  if (customerCancelled) {
    const owned = await bookingOwnedByUser(row, actorUserId);
    if (!owned) {
      return { success: false as const, error: "You can only cancel your own bookings" };
    }
    const blockReason = riderCancelIneligibilityReason({
      bookingStatus: String(row.booking_status ?? ""),
    });
    if (blockReason) {
      return { success: false as const, error: blockReason };
    }
    if (
      !canRiderCancelBeforeOwnerApproval({
        bookingStatus: String(row.booking_status ?? ""),
        paymentStatus: row.payment_status,
        pickupDate: row.pickup_date,
        pickupTime: row.pickup_time,
      })
    ) {
      return { success: false as const, error: "This booking can no longer be cancelled" };
    }
  }

  const alreadyCancelled = String(row.booking_status ?? "").toLowerCase() === "cancelled";
  if (alreadyCancelled) {
    return { success: false as const, error: "Booking is already cancelled" };
  }

  const refund = computeBookingRefund(row);
  const now = new Date().toISOString();
  const reasonText = input.reason.trim();
  const paymentCompleted = isRiderPaymentCompleted(row.payment_status);
  const refundAmount = paymentCompleted ? refund.totalRefundAmount : 0;
  const refundStatus = paymentCompleted
    ? refundAmount > 0
      ? "pending"
      : "not_required"
    : "not_required";

  const updatePayload: Record<string, unknown> = {
    booking_status: "cancelled",
    cancel_reason: reasonText,
    cancellation_reason: reasonText,
    cancelled_by: actorUserId,
    cancelled_by_role: normalizeCancelledByRole(input.cancelledByRole),
    cancelled_at: now,
    cancellation_charges: paymentCompleted ? refund.cancellationCharges : 0,
    refund_amount: refundAmount,
    refund_trip_fare_amount: paymentCompleted ? refund.tripFareRefundAmount : 0,
    refund_deposit_amount: paymentCompleted ? refund.securityDepositRefundAmount : 0,
    refund_status: refundStatus,
  };

  if (input.reasonCategory) {
    updatePayload.cancellation_reason_category = input.reasonCategory;
  }
  if (customerCancelled && !row.user_id) {
    updatePayload.user_id = actorUserId;
  }

  const { error: updateError } = await applyBookingUpdateWithColumnFallback(db, row.id, updatePayload);
  if (updateError) return { success: false as const, error: updateError };

  await cancelOwnerEarningsForBooking(input.bookingId);

  await releaseReturnJourneySeats(db, row);
  await releaseVehicleAvailability(db, row);

  await insertCancellationLog(db, {
    bookingId: input.bookingId,
    userId: row.user_id ?? actorUserId,
    cancelledByRole: input.cancelledByRole,
    reasonCategory: input.reasonCategory,
    reason: input.reason.trim(),
    refund,
  });

  await insertBookingActivityLog(db, {
    bookingId: input.bookingId,
    eventType: "booking_cancelled",
    actorUserId,
    actorRole: normalizeCancelledByRole(input.cancelledByRole),
    reason: reasonText,
    clientIp: input.clientIp,
  });

  if (refund.refundEligible && refundAmount > 0) {
    await createPendingRefundRecord(db, input.bookingId, refundAmount, input.reason.trim());
  }

  const bookingRef = row.booking_reference ?? input.bookingId.slice(0, 8);
  const riderRoleLabel = normalizeCancelledByRole(input.cancelledByRole);

  const refundMessage =
    refundAmount > 0
      ? `Refund pending: ₹${refundAmount}.`
      : paymentCompleted
        ? "No refund due per policy."
        : "No payment received.";

  await createNotification({
    recipientRole: "admin",
    type: "booking_cancelled",
    title: "Booking cancelled",
    message: `Booking ${bookingRef} cancelled by ${riderRoleLabel === "rider" ? "Rider" : riderRoleLabel}. ${refundMessage}`,
    metadata: {
      bookingId: input.bookingId,
      refundAmount,
      cancellationCharges: paymentCompleted ? refund.cancellationCharges : 0,
      reasonCategory: input.reasonCategory,
      reason: reasonText,
    },
  });

  if (row.owner_id) {
    await createNotification({
      recipientId: row.owner_id,
      recipientRole: "owner",
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: `Booking ${bookingRef} was cancelled by Rider before approval. No further action required.`,
      metadata: { bookingId: input.bookingId, bookingReference: bookingRef },
    });
  }

  const notifyRiderId = row.user_id ?? (customerCancelled ? actorUserId : null);
  if (notifyRiderId) {
    await createNotification({
      recipientId: notifyRiderId,
      recipientRole: "rider",
      type: "booking_cancelled",
      title: "Booking cancelled",
      message: "Your booking has been cancelled successfully.",
      metadata: {
        bookingId: input.bookingId,
        refundAmount,
        cancellationCharges: paymentCompleted ? refund.cancellationCharges : 0,
      },
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
  if (String(row.booking_status ?? "").toLowerCase() !== "cancelled") {
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

  const { error } = await applyBookingUpdateWithColumnFallback(db, input.bookingId, update);
  if (error) return { success: false as const, error };

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

  let remainingRefund = refundAmount;

  const { data: bookingWalletRow } = await db
    .from("bookings")
    .select("wallet_amount_used, user_id")
    .eq("id", bookingId)
    .maybeSingle();

  const walletUsed = Number(
    (bookingWalletRow as { wallet_amount_used?: number } | null)?.wallet_amount_used ?? 0
  );
  const riderUserId = String(
    row.user_id ?? (bookingWalletRow as { user_id?: string } | null)?.user_id ?? ""
  ).trim();

  if (walletUsed > 0 && riderUserId) {
    const walletRefund = Math.min(walletUsed, remainingRefund);
    if (walletRefund > 0) {
      const { creditWallet } = await import("@/lib/services/wallet");
      await creditWallet({
        userId: riderUserId,
        amount: walletRefund,
        source: "refund",
        referenceId: bookingId,
        description: "Booking cancellation refund (wallet portion)",
      });
      remainingRefund -= walletRefund;
    }
  }

  if (remainingRefund <= 0) {
    await updateRefundStatus({ bookingId, status: "refunded" });
    return { success: true as const, message: "Refund completed (wallet credit)" };
  }

  const { data: payment } = await db
    .from("payments")
    .select("id, razorpay_payment_id, amount, status")
    .eq("booking_id", bookingId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const paymentRow = payment as { id?: string; razorpay_payment_id?: string; amount?: number } | null;
  if (!paymentRow?.razorpay_payment_id) {
    if (remainingRefund < refundAmount) {
      await updateRefundStatus({ bookingId, status: "refunded" });
      return {
        success: true as const,
        message: "Partial refund completed (wallet credit; no online payment record)",
      };
    }
    await updateRefundStatus({ bookingId, status: "refunded" });
    return { success: true as const, message: "Refund marked complete (no online payment record)" };
  }

  try {
    const refundPayAmount = Math.min(remainingRefund, Number(paymentRow.amount ?? remainingRefund));
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
  const rows = await selectBookingsWithFilter(
    [
      "booking_status, refund_status, refund_amount",
      "booking_status, cancel_reason",
      "booking_status",
    ],
    (columns) => {
      const db = createAdminClient();
      return db
        .from("bookings")
        .select(columns)
        .eq("booking_status", "cancelled")
        .limit(500);
    }
  );

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
  const rows = await selectBookingsWithFilter(BOOKING_CANCELLED_LIST_COLUMN_SETS, (columns) => {
    const db = createAdminClient();
    return db
      .from("bookings")
      .select(columns)
      .eq("booking_status", "cancelled")
      .order("cancelled_at", { ascending: false })
      .limit(limit);
  });

  return rows.map((row) => {
    const protection = deriveProtectionFields(row);
    return {
      id: String(row.id),
      booking_reference: (row.booking_reference as string | null) ?? undefined,
      booking_type: (row.booking_type as string | null) ?? undefined,
      passenger_name: (row.passenger_name as string | null) ?? undefined,
      mobile: (row.mobile as string | null) ?? undefined,
      amount: Number(row.amount ?? 0) || null,
      refund_amount: Number(row.refund_amount ?? 0) || null,
      refund_status: (row.refund_status as string | null) ?? undefined,
      cancellation_reason:
        (row.cancel_reason as string | null) ??
        (row.cancellation_reason as string | null) ??
        undefined,
      cancelled_at: (row.cancelled_at as string | null) ?? undefined,
      pickup_date: (row.pickup_date as string | null) ?? undefined,
      payment_status: (row.payment_status as string | null) ?? undefined,
      protection_selected: protection.protection_selected,
      protection_fee: protection.protection_fee ?? null,
    };
  });
}

export async function getUserRefundHistory(userId: string, limit = 50) {
  const rows = await selectBookingsWithFilter(
    [
      "id, booking_reference, booking_type, amount, refund_amount, refund_status, cancel_reason, cancelled_at, pickup_date, pickup_time, booking_status, passenger_name, payment_status, created_at, special_instructions",
      "id, booking_reference, booking_type, amount, cancel_reason, cancelled_at, booking_status, passenger_name, payment_status, created_at",
    ],
    (columns) => {
      const db = createAdminClient();
      return db
        .from("bookings")
        .select(columns)
        .eq("user_id", userId)
        .eq("booking_status", "cancelled")
        .order("cancelled_at", { ascending: false })
        .limit(limit);
    }
  );

  return rows
    .filter((row) => row.refund_status || String(row.booking_status) === "cancelled")
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
      cancelled_at: (row.cancelled_at as string | null) ?? undefined,
      refund_amount: Number(row.refund_amount ?? 0),
      refund_status: (row.refund_status as string | null) ?? undefined,
      refund_processed_at: (row.refund_processed_at as string | null) ?? undefined,
      cancellation_reason:
        (row.cancel_reason as string | null) ??
        (row.cancellation_reason as string | null) ??
        undefined,
    }));
}
