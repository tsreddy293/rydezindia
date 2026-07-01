/**
 * Production `bookings` columns verified against live Supabase (2026-06).
 * Do not SELECT/INSERT/UPDATE columns listed in BOOKING_ABSENT_COLUMNS.
 */

/** Core marketplace booking fields present in production. */
export const BOOKING_PRODUCTION_CORE =
  "id, booking_reference, booking_type, passenger_name, mobile, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, trip_type, vehicle_id, owner_id, user_id, created_at, reference_id, special_instructions";

/** Cancellation fields confirmed in production. */
export const BOOKING_PRODUCTION_CANCELLATION =
  "cancelled_at, cancelled_by, cancel_reason";

/** Return-journey linkage (legacy bookings table). */
export const BOOKING_PRODUCTION_RETURN = "ride_id, seats_booked";

/**
 * Columns confirmed absent — never include in queries.
 * Use booking_status='cancelled' instead of cancellation_status.
 * Encode flexible protection in special_instructions (see protection-instructions.ts).
 */
export const BOOKING_ABSENT_COLUMNS = [
  "cancellation_status",
  "flexible_cancellation",
  "flexible_cancellation_fee",
] as const;

/** Optional columns from migrations — queried only in fallback tiers. */
export const BOOKING_OPTIONAL_REFUND =
  "refund_amount, refund_status, refund_processed_at, refund_trip_fare_amount, refund_deposit_amount";

export const BOOKING_OPTIONAL_FARE =
  "trip_fare_amount, security_deposit_amount, advance_amount, balance_amount, amount_paid, amount_due, deposit_refund_amount, deposit_refund_status, base_fare, platform_fee, discount_amount";

export const BOOKING_OPTIONAL_PROTECTION =
  "protection_selected, protection_fee, protection_plan_name, protection_purchase_date, protection_status";

export const BOOKING_OPTIONAL_CANCELLATION_EXTENDED =
  "cancellation_reason, cancellation_reason_category, cancellation_charges, cancelled_by_role";

export function joinBookingColumns(...groups: string[]): string {
  return groups.join(", ");
}
