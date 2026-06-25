"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBookingWithRefund,
  computeBookingRefund,
  executeApprovedRefund,
  fetchBookingForCancellation,
  getRefundAnalytics,
  updateRefundStatus,
} from "@/lib/services/booking-cancellation";
import { bookingOwnedByUser } from "@/lib/bookings/fetch-booking-for-cancellation";
import {
  isRiderCancellableBookingStatus,
  isRiderPaymentCompleted,
} from "@/lib/bookings/my-bookings-utils";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";
import type { RefundCalculationResult } from "@/lib/services/cancellation-policy";
import type { CancellationReasonCategory } from "@/lib/services/cancellation-reasons";

function assertRiderCanCancel(row: Awaited<ReturnType<typeof fetchBookingForCancellation>>) {
  if (!row) return "Booking not found";
  const bookingStatus = String(row.booking_status ?? "").toLowerCase().trim();
  if (
    row.cancellation_status === "cancelled" ||
    bookingStatus === "cancelled" ||
    bookingStatus === "already_cancelled"
  ) {
    return "Booking is already cancelled";
  }
  if (!isRiderCancellableBookingStatus(bookingStatus)) {
    return "This booking can no longer be cancelled";
  }
  return null;
}

export async function getRefundEstimateAction(bookingId: string): Promise<
  ActionResult<{
    bookingId: string;
    bookingReference?: string;
    bookingStatus: string;
    paymentStatus: string;
    paymentCompleted: boolean;
    tripFarePaid: number;
    refundableDeposit: number;
    protectionFee: number;
    refund: RefundCalculationResult;
  }>
> {
  const { user } = await requireRole("user");
  const normalizedId = String(bookingId ?? "").trim();
  console.log("[getRefundEstimateAction] bookingId:", normalizedId);

  const row = await fetchBookingForCancellation(normalizedId);
  if (!row) return { success: false, error: "Booking not found" };

  const owned = await bookingOwnedByUser(row, user.id);
  if (!owned) return { success: false, error: "Access denied" };

  const eligibilityError = assertRiderCanCancel(row);
  if (eligibilityError) return { success: false, error: eligibilityError };

  const refund = computeBookingRefund(row);
  const paymentStatus = String(row.payment_status ?? "pending");

  return {
    success: true,
    data: {
      bookingId: row.id,
      bookingReference: row.booking_reference ?? undefined,
      bookingStatus: String(row.booking_status ?? "pending"),
      paymentStatus,
      paymentCompleted: isRiderPaymentCompleted(paymentStatus),
      tripFarePaid: Number(row.trip_fare_amount ?? row.amount ?? 0),
      refundableDeposit: Number(row.security_deposit_amount ?? 0),
      protectionFee: Number(row.flexible_cancellation_fee ?? 0),
      refund,
    },
  };
}

export async function cancelBookingByCustomer(input: {
  bookingId: string;
  reasonCategory: CancellationReasonCategory | string;
  reasonDetails?: string;
}): Promise<ActionResult<{ refundAmount: number; policyTier: string; cancellationCharges: number }>> {
  const { user } = await requireRole("user");
  if (!input.reasonCategory.trim()) {
    return { success: false, error: "Please select a cancellation reason" };
  }

  const { formatCancellationReason } = await import("@/lib/services/cancellation-reasons");
  const reason = formatCancellationReason(input.reasonCategory, input.reasonDetails);

  if (input.reasonCategory === "other" && !input.reasonDetails?.trim()) {
    return { success: false, error: "Please describe your reason for cancelling" };
  }

  const normalizedId = String(input.bookingId ?? "").trim();
  console.log("[cancelBookingByCustomer] bookingId:", normalizedId);

  const result = await cancelBookingWithRefund({
    bookingId: normalizedId,
    reason,
    reasonCategory: input.reasonCategory,
    actorUserId: user.id,
    cancelledByRole: "rider",
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/user/bookings");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/user/dashboard");
  revalidatePath("/dashboard");
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/bookings");

  return {
    success: true,
    data: {
      refundAmount: result.data.refund.totalRefundAmount,
      policyTier: result.data.refund.policyTier,
      cancellationCharges: result.data.refund.cancellationCharges,
    },
    message: "Booking cancelled successfully",
  };
}

export async function approveBookingRefund(bookingId: string): Promise<ActionResult> {
  await requireRole("admin");
  const result = await updateRefundStatus({ bookingId, status: "approved" });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/admin/refunds");
  return { success: true, message: "Refund approved" };
}

export async function rejectBookingRefund(bookingId: string, note?: string): Promise<ActionResult> {
  await requireRole("admin");
  const result = await updateRefundStatus({ bookingId, status: "rejected", adminNote: note });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/admin/refunds");
  return { success: true, message: "Refund rejected" };
}

export async function processBookingRefund(bookingId: string): Promise<ActionResult> {
  await requireRole("admin");
  const result = await executeApprovedRefund(bookingId);
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/bookings");
  return { success: true, message: result.message ?? "Refund processed" };
}

export async function fetchRefundAnalyticsAction() {
  await requireRole("admin");
  return getRefundAnalytics();
}
