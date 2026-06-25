/** Rider cancellation eligibility — pre-owner-approval only. */

export type OwnerApprovalStatus = "pending" | "approved";
export type TripPhaseStatus = "not_started" | "started" | "completed";

const RIDER_CANCELLABLE_BOOKING_STATUSES = new Set([
  "pending",
  "payment_pending",
  "payment_completed",
  "awaiting_admin_approval",
  "awaiting_owner_approval",
  "booking_created",
  "confirmed",
]);

const RIDER_NON_CANCELLABLE_BOOKING_STATUSES = new Set([
  "owner_confirmed",
  "trip_started",
  "trip_completed",
  "cancelled",
  "already_cancelled",
  "active",
  "completed",
]);

const OWNER_APPROVED_STATUSES = new Set([
  "owner_confirmed",
  "trip_started",
  "trip_completed",
  "active",
  "completed",
]);

const TRIP_STARTED_STATUSES = new Set(["trip_started", "active"]);
const TRIP_COMPLETED_STATUSES = new Set(["trip_completed", "completed"]);

function isRiderCancellableBookingStatus(status: string): boolean {
  const normalized = String(status ?? "").toLowerCase().trim();
  if (!normalized) return false;
  if (RIDER_NON_CANCELLABLE_BOOKING_STATUSES.has(normalized)) return false;
  return RIDER_CANCELLABLE_BOOKING_STATUSES.has(normalized);
}

function isRiderTripStartedOrCompleted(status: string): boolean {
  const normalized = String(status ?? "").toLowerCase().trim();
  return (
    normalized === "trip_started" ||
    normalized === "trip_completed" ||
    normalized === "active" ||
    normalized === "completed"
  );
}

export function isBookingCancelledStatus(
  bookingStatus?: string | null,
  cancellationStatus?: string | null
): boolean {
  const status = String(bookingStatus ?? "").toLowerCase().trim();
  return (
    cancellationStatus === "cancelled" ||
    status === "cancelled" ||
    status === "already_cancelled"
  );
}

export function deriveOwnerApprovalStatus(bookingStatus: string): OwnerApprovalStatus {
  const normalized = String(bookingStatus ?? "").toLowerCase().trim();
  return OWNER_APPROVED_STATUSES.has(normalized) ? "approved" : "pending";
}

export function deriveTripPhaseStatus(bookingStatus: string): TripPhaseStatus {
  const normalized = String(bookingStatus ?? "").toLowerCase().trim();
  if (TRIP_COMPLETED_STATUSES.has(normalized)) return "completed";
  if (TRIP_STARTED_STATUSES.has(normalized)) return "started";
  return "not_started";
}

/** Rider may cancel only before owner approval and before trip starts. */
export function canRiderCancelBeforeOwnerApproval(input: {
  bookingStatus: string;
  paymentStatus?: string | null;
  cancellationStatus?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
}): boolean {
  const status = String(input.bookingStatus ?? "").toLowerCase().trim();
  if (isBookingCancelledStatus(status, input.cancellationStatus)) return false;
  if (deriveOwnerApprovalStatus(status) === "approved") return false;
  if (deriveTripPhaseStatus(status) !== "not_started") return false;
  if (isRiderTripStartedOrCompleted(status)) return false;
  return isRiderCancellableBookingStatus(status);
}

export function riderCancelIneligibilityReason(input: {
  bookingStatus: string;
  cancellationStatus?: string | null;
}): string | null {
  const status = String(input.bookingStatus ?? "").toLowerCase().trim();
  if (isBookingCancelledStatus(status, input.cancellationStatus)) {
    return "Booking is already cancelled";
  }
  if (deriveOwnerApprovalStatus(status) === "approved") {
    return "Cannot cancel after owner approval";
  }
  if (deriveTripPhaseStatus(status) !== "not_started") {
    return "Cannot cancel after the trip has started";
  }
  if (!isRiderCancellableBookingStatus(status)) {
    return "This booking can no longer be cancelled";
  }
  return null;
}
