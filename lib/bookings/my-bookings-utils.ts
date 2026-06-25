/** Helpers for the My Bookings dashboard module. */

import {
  isBookingCancelledStatus,
} from "@/lib/bookings/cancellation-eligibility";

export function parseReturnScheduleFromInstructions(text?: string | null): {
  returnDate?: string;
  returnTime?: string;
} {
  if (!text?.trim()) return {};
  const dateMatch = text.match(/Return date:\s*(\d{4}-\d{2}-\d{2})/i);
  const timeMatch = text.match(/Return time:\s*(\d{1,2}:\d{2})/i);
  return {
    returnDate: dateMatch?.[1],
    returnTime: timeMatch?.[1],
  };
}

export function isTripStartReached(
  pickupDate?: string | null,
  pickupTime?: string | null,
  reference: Date = new Date()
): boolean {
  if (!pickupDate?.trim()) return false;
  const time = (pickupTime?.trim() || "00:00").slice(0, 5);
  const start = new Date(`${pickupDate.trim()}T${time}:00`);
  if (Number.isNaN(start.getTime())) return false;
  return reference.getTime() >= start.getTime();
}

/** Statuses where the rider may cancel before owner/admin approval. */
export const RIDER_CANCELLABLE_BOOKING_STATUSES = new Set([
  "pending",
  "payment_pending",
  "payment_completed",
  "awaiting_admin_approval",
  "awaiting_owner_approval",
  "booking_created",
  // legacy: paid but awaiting owner/admin action
  "confirmed",
]);

/** Statuses where cancel must be hidden (approved, in-trip, or done). */
export const RIDER_NON_CANCELLABLE_BOOKING_STATUSES = new Set([
  "owner_confirmed",
  "trip_started",
  "trip_completed",
  "cancelled",
  "already_cancelled",
  // legacy trip lifecycle
  "active",
  "completed",
]);

export function isRiderCancellableBookingStatus(status: string): boolean {
  const normalized = String(status ?? "").toLowerCase().trim();
  if (!normalized) return false;
  if (RIDER_NON_CANCELLABLE_BOOKING_STATUSES.has(normalized)) return false;
  return RIDER_CANCELLABLE_BOOKING_STATUSES.has(normalized);
}

export function isRiderTripStartedOrCompleted(status: string): boolean {
  const normalized = String(status ?? "").toLowerCase().trim();
  return (
    normalized === "trip_started" ||
    normalized === "trip_completed" ||
    normalized === "active" ||
    normalized === "completed"
  );
}

export function isRiderPaymentCompleted(paymentStatus?: string | null): boolean {
  const payment = String(paymentStatus ?? "").toLowerCase();
  return payment === "paid" || payment === "partial" || payment === "payment_completed";
}

export {
  canRiderCancelBeforeOwnerApproval as canCustomerCancelBooking,
  isBookingCancelledStatus,
  deriveOwnerApprovalStatus,
  deriveTripPhaseStatus,
} from "@/lib/bookings/cancellation-eligibility";

/** Payment badge label for rider booking cards (handles cancelled state). */
export function formatRiderPaymentBadgeLabel(input: {
  bookingStatus: string;
  paymentStatus?: string | null;
  cancellationStatus?: string | null;
  refundStatus?: string | null;
}): string {
  const cancelled = isBookingCancelledStatus(input.bookingStatus, input.cancellationStatus);
  if (cancelled) {
    const refund = String(input.refundStatus ?? "").toLowerCase();
    if (refund === "refunded") return "Payment Refunded";
    if (refund === "pending" || refund === "processing" || refund === "approved") {
      return "Refund Pending";
    }
    return "Booking Cancelled";
  }
  return formatPaymentStatusLabel(input.paymentStatus ?? "pending");
}

export function formatBookingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    self_drive: "Self Drive",
    with_driver: "With Driver",
    return_journey: "Return Journey",
    local_rental: "Local Rental",
  };
  return labels[type.toLowerCase()] ?? type.replace(/_/g, " ");
}

export function formatBookingStatusLabel(status: string): string {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    booking_created: "Booking Created",
    payment_pending: "Payment Pending",
    payment_completed: "Payment Completed",
    awaiting_admin_approval: "Awaiting Admin Approval",
    awaiting_owner_approval: "Awaiting Owner Approval",
    owner_confirmed: "Owner Confirmed",
    trip_started: "Trip Started",
    trip_completed: "Trip Completed",
    already_cancelled: "Cancelled",
    pending: "Pending",
    confirmed: "Confirmed",
    active: "Trip Started",
    completed: "Completed",
    cancelled: "Cancelled",
    approved: "Approved",
    paid: "Paid",
  };
  return labels[key] ?? status.replace(/_/g, " ");
}

export function formatPaymentStatusLabel(status: string): string {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    pending: "Payment Pending",
    paid: "Paid",
    partial: "Partially Paid",
    refunded: "Refunded",
    failed: "Failed",
  };
  return labels[key] ?? status.replace(/_/g, " ");
}

export function formatRefundStatusLabel(status: string): string {
  const key = status.toLowerCase();
  if (key === "not_required") return "No Payment Received";
  if (key === "pending" || key === "processing") return "Refund Pending";
  if (key === "approved") return "Approved";
  if (key === "refunded") return "Payment Refunded";
  if (key === "rejected") return "Rejected";
  return status.replace(/_/g, " ");
}

export function resolveVehicleImage(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const photoUrl = row.vehicle_photo_url;
  if (typeof photoUrl === "string" && photoUrl.trim()) return photoUrl;
  const photos = row.photos;
  if (Array.isArray(photos) && photos[0]) return String(photos[0]);
  return null;
}

export function formatScheduleLine(date?: string, time?: string): string {
  if (!date) return "—";
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

export type BookingFilterTab = "all" | "active" | "completed" | "cancelled";

export function filterBookingsByTab<T extends { booking_status: string; cancellation_status?: string | null }>(
  bookings: T[],
  tab: BookingFilterTab
): T[] {
  if (tab === "all") return bookings;
  if (tab === "cancelled") {
    return bookings.filter(
      (b) =>
        b.cancellation_status === "cancelled" || b.booking_status.toLowerCase() === "cancelled"
    );
  }
  if (tab === "completed") {
    return bookings.filter((b) => b.booking_status.toLowerCase() === "completed");
  }
  return bookings.filter((b) => {
    const status = b.booking_status.toLowerCase();
    return (
      status !== "cancelled" &&
      status !== "completed" &&
      b.cancellation_status !== "cancelled"
    );
  });
}
