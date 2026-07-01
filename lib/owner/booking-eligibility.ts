import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";

/** Closed bookings must not surface in Action Center, payments, earnings, or wallet. */
const OWNER_CLOSED_BOOKING_STATUSES = new Set([
  "cancelled",
  "already_cancelled",
  "refunded",
  "expired",
  "rejected",
  "failed",
  "completed",
  "trip_completed",
]);

/** Statuses where customer payment verification may still be required. */
const CUSTOMER_PAYMENT_ACTIONABLE_STATUSES = new Set([
  "pending",
  "payment_pending",
  "confirmed",
  "active",
  "awaiting_owner_approval",
  "awaiting_admin_approval",
  "booking_created",
  "owner_confirmed",
]);

export type OwnerBookingEligibilityInput = {
  id?: string;
  bookingStatus?: string | null;
  paymentStatus?: string | null;
  refundStatus?: string | null;
};

export type OwnerEarningEligibilityInput = {
  booking_id?: string | null;
  status?: string | null;
  net_amount?: number | string | null;
  gross_amount?: number | string | null;
  platform_fee?: number | string | null;
  earned_at?: string | null;
  created_at?: string | null;
};

function normalize(value: string | null | undefined): string {
  return String(value ?? "").toLowerCase().trim();
}

export function isOwnerClosedBooking(booking: OwnerBookingEligibilityInput): boolean {
  const bookingStatus = normalize(booking.bookingStatus);
  if (OWNER_CLOSED_BOOKING_STATUSES.has(bookingStatus)) return true;
  if (isBookingCancelledStatus(booking.bookingStatus)) return true;

  const paymentStatus = normalize(booking.paymentStatus);
  if (paymentStatus === "refunded" || paymentStatus === "failed") return true;

  const refundStatus = normalize(booking.refundStatus);
  if (
    refundStatus === "refunded" ||
    refundStatus === "rejected" ||
    refundStatus === "refund_completed"
  ) {
    return true;
  }

  return false;
}

export function isCustomerPaymentPending(paymentStatus?: string | null): boolean {
  const payment = normalize(paymentStatus);
  return (
    payment === "pending" ||
    payment === "payment_pending" ||
    payment === "partial"
  );
}

/** Customer payment still needs verification before the trip can proceed. */
export function requiresCustomerPaymentAction(booking: OwnerBookingEligibilityInput): boolean {
  if (isOwnerClosedBooking(booking)) return false;

  const payment = normalize(booking.paymentStatus);
  if (payment === "partial") return true;

  if (!isCustomerPaymentPending(booking.paymentStatus)) return false;
  return CUSTOMER_PAYMENT_ACTIONABLE_STATUSES.has(normalize(booking.bookingStatus));
}

/** Owner settlement is pending on an active or confirmed trip. */
export function requiresOwnerSettlementAction(
  booking: OwnerBookingEligibilityInput,
  hasUnsettledEarning: boolean
): boolean {
  if (isOwnerClosedBooking(booking)) return false;
  if (!hasUnsettledEarning) return false;
  const status = normalize(booking.bookingStatus);
  return status === "active" || status === "confirmed";
}

/** Actionable payment item for Action Center / Pending Payments widgets. */
export function requiresOwnerPaymentAction(
  booking: OwnerBookingEligibilityInput,
  options?: { hasUnsettledEarning?: boolean }
): boolean {
  return (
    requiresCustomerPaymentAction(booking) ||
    requiresOwnerSettlementAction(booking, options?.hasUnsettledEarning ?? false)
  );
}

export function filterActionablePendingPaymentBookings<T extends OwnerBookingEligibilityInput>(
  bookings: T[],
  earnings?: OwnerEarningEligibilityInput[]
): T[] {
  const unsettledBookingIds = buildUnsettledEarningBookingIds(earnings);
  return bookings.filter((booking) =>
    requiresOwnerPaymentAction(booking, {
      hasUnsettledEarning: Boolean(booking.id && unsettledBookingIds.has(booking.id)),
    })
  );
}

export function countActionablePendingPayments(
  bookings: OwnerBookingEligibilityInput[],
  earnings?: OwnerEarningEligibilityInput[]
): number {
  return filterActionablePendingPaymentBookings(bookings, earnings).length;
}

function buildUnsettledEarningBookingIds(earnings?: OwnerEarningEligibilityInput[]): Set<string> {
  const ids = new Set<string>();
  for (const row of earnings ?? []) {
    if (!isUnsettledOwnerEarning(row)) continue;
    const bookingId = String(row.booking_id ?? "").trim();
    if (bookingId) ids.add(bookingId);
  }
  return ids;
}

export function isUnsettledOwnerEarning(earning: OwnerEarningEligibilityInput): boolean {
  return normalize(earning.status) !== "settled";
}

/** Earnings tied to closed bookings are excluded from wallet, revenue, and settlement totals. */
export function isActionableOwnerEarning(
  earning: OwnerEarningEligibilityInput,
  bookingsById: Map<string, OwnerBookingEligibilityInput>
): boolean {
  const bookingId = String(earning.booking_id ?? "").trim();
  if (!bookingId) return true;
  const booking = bookingsById.get(bookingId);
  if (!booking) return false;
  return !isOwnerClosedBooking(booking);
}

export function filterActionableOwnerEarnings<T extends OwnerEarningEligibilityInput>(
  earnings: T[],
  bookings: OwnerBookingEligibilityInput[]
): T[] {
  const bookingsById = new Map(
    bookings.filter((b) => b.id).map((b) => [String(b.id), b] as const)
  );
  return earnings.filter((row) => isActionableOwnerEarning(row, bookingsById));
}

export function sumActionableOwnerEarnings(
  earnings: OwnerEarningEligibilityInput[],
  bookings: OwnerBookingEligibilityInput[],
  filter?: (row: OwnerEarningEligibilityInput) => boolean
): number {
  return filterActionableOwnerEarnings(earnings, bookings)
    .filter(filter ?? (() => true))
    .reduce((sum, row) => {
      const amount = Number(row.net_amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}

export function buildOwnerBookingsById(
  bookings: OwnerBookingEligibilityInput[]
): Map<string, OwnerBookingEligibilityInput> {
  return new Map(bookings.filter((b) => b.id).map((b) => [String(b.id), b] as const));
}
