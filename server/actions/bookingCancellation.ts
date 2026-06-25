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
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";
import type { RefundCalculationResult } from "@/lib/services/cancellation-policy";
import type { CancellationReasonCategory } from "@/lib/services/cancellation-reasons";
import { isTripStartReached } from "@/lib/bookings/my-bookings-utils";

export async function getRefundEstimateAction(bookingId: string): Promise<ActionResult<RefundCalculationResult>> {
  const { user } = await requireRole("user");
  const row = await fetchBookingForCancellation(bookingId);
  if (!row) return { success: false, error: "Booking not found" };
  if (row.user_id !== user.id) return { success: false, error: "Access denied" };
  if (String(row.booking_status ?? "").toLowerCase() !== "confirmed") {
    return { success: false, error: "Only confirmed bookings can be cancelled" };
  }
  if (isTripStartReached(row.pickup_date, row.pickup_time)) {
    return { success: false, error: "Cannot cancel after trip start time" };
  }
  return { success: true, data: computeBookingRefund(row) };
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

  const result = await cancelBookingWithRefund({
    bookingId: input.bookingId,
    reason,
    reasonCategory: input.reasonCategory,
    cancelledBy: "user",
    userId: user.id,
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/user/bookings");
  revalidatePath("/dashboard/bookings");
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
  return { success: true, message: result.message ?? "Refund processed" };
}

export async function fetchRefundAnalyticsAction() {
  await requireRole("admin");
  return getRefundAnalytics();
}
