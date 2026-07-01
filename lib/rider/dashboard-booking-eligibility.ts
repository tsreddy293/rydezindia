import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import {
  isOwnerClosedBooking,
  requiresCustomerPaymentAction,
  type OwnerBookingEligibilityInput,
} from "@/lib/owner/booking-eligibility";
import type { RiderDashboardBooking } from "@/lib/rider/dashboard-types";

const COMPLETED_BOOKING_STATUSES = new Set(["completed", "trip_completed"]);

const UPCOMING_TRIP_BOOKING_STATUSES = new Set([
  "confirmed",
  "pending",
  "payment_pending",
  "active",
]);

const PAYMENT_REMINDER_NOTIFICATION_TYPES = new Set([
  "balance_due_reminder",
  "balance_collected",
]);

function normalize(value: string | null | undefined): string {
  return String(value ?? "").toLowerCase().trim();
}

export type RiderDashboardBookingInput = OwnerBookingEligibilityInput & {
  cancelledAt?: string | null;
  bookingType?: string | null;
  selfDrivePayment?: RiderDashboardBooking["selfDrivePayment"];
};

/** Cancelled, completed, and fully refunded bookings must not drive payment/upcoming alerts. */
export function isExcludedFromRiderDashboardAlerts(
  booking: RiderDashboardBookingInput
): boolean {
  if (isOwnerClosedBooking(booking)) return true;
  if (isBookingCancelledStatus(booking.bookingStatus)) return true;
  if (booking.cancelledAt) return true;

  const status = normalize(booking.bookingStatus);
  if (COMPLETED_BOOKING_STATUSES.has(status)) return true;

  const refundStatus = normalize(booking.refundStatus);
  if (refundStatus === "refund_completed" || refundStatus === "refunded") return true;

  return false;
}

export function isActiveRiderDashboardBooking(booking: RiderDashboardBookingInput): boolean {
  return !isExcludedFromRiderDashboardAlerts(booking);
}

/** Upcoming ride widget / Action Center count — active trips only. */
export function isUpcomingRiderTripBooking(booking: RiderDashboardBookingInput): boolean {
  if (isExcludedFromRiderDashboardAlerts(booking)) return false;
  return UPCOMING_TRIP_BOOKING_STATUSES.has(normalize(booking.bookingStatus));
}

/** Payment Pending count and payment reminder banners — active bookings with amount still due. */
export function requiresRiderPaymentReminder(booking: RiderDashboardBookingInput): boolean {
  if (isExcludedFromRiderDashboardAlerts(booking)) return false;

  if (requiresCustomerPaymentAction(booking)) return true;

  if (
    normalize(booking.bookingType) === "self_drive" &&
    booking.selfDrivePayment &&
    booking.selfDrivePayment.balanceDue > 0
  ) {
    const status = normalize(booking.bookingStatus);
    const payment = normalize(booking.paymentStatus);
    if (payment === "partial" && status === "confirmed") return true;
    if (UPCOMING_TRIP_BOOKING_STATUSES.has(status)) return true;
  }

  return false;
}

/** Refund reminders — only while refund is in progress (not after completion). */
export function hasActiveRefundReminder(booking: RiderDashboardBookingInput): boolean {
  const refundStatus = normalize(booking.refundStatus);
  if (refundStatus === "refunded" || refundStatus === "refund_completed") return false;
  if (!(refundStatus === "pending" || refundStatus === "approved" || refundStatus === "processing")) {
    return false;
  }
  return (
    isBookingCancelledStatus(booking.bookingStatus) ||
    Boolean(booking.cancelledAt) ||
    isOwnerClosedBooking(booking)
  );
}

export function filterRiderPaymentNotifications<
  T extends { type?: string | null; metadata?: unknown },
>(notifications: T[], excludedBookingIds: ReadonlySet<string>): T[] {
  return notifications.filter((notification) => {
    const type = String(notification.type ?? "");
    if (!PAYMENT_REMINDER_NOTIFICATION_TYPES.has(type)) return true;

    const metadata = notification.metadata as { bookingId?: string } | null | undefined;
    const bookingId = String(metadata?.bookingId ?? "").trim();
    if (!bookingId) return true;

    return !excludedBookingIds.has(bookingId);
  });
}

export function collectExcludedRiderBookingIds(
  bookings: RiderDashboardBookingInput[]
): Set<string> {
  const ids = new Set<string>();
  for (const booking of bookings) {
    if (!booking.id) continue;
    if (isExcludedFromRiderDashboardAlerts(booking)) {
      ids.add(String(booking.id));
    }
  }
  return ids;
}
