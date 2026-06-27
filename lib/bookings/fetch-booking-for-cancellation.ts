import { createAdminClient } from "@/lib/supabase/admin";
import {
  BOOKING_CANCELLATION_COLUMN_SETS,
  deriveProtectionFields,
  selectBookingById,
} from "@/lib/bookings/booking-select";
import type { BookingCancellationRow } from "@/lib/services/booking-cancellation";

type Row = Record<string, unknown>;

function getString(row: Row | null | undefined, key: string, fallback = ""): string {
  const value = row?.[key];
  return value === null || value === undefined ? fallback : String(value);
}

function mapRowToCancellationRow(row: Row): BookingCancellationRow {
  const protection = deriveProtectionFields(row);
  return {
    id: getString(row, "id"),
    user_id: getString(row, "user_id") || undefined,
    owner_id: getString(row, "owner_id") || undefined,
    booking_type: getString(row, "booking_type") || undefined,
    trip_type: getString(row, "trip_type") || undefined,
    booking_status: getString(row, "booking_status") || undefined,
    payment_status: getString(row, "payment_status") || undefined,
    amount: Number(row.amount ?? 0) || undefined,
    trip_fare_amount: Number(row.trip_fare_amount ?? 0) || undefined,
    security_deposit_amount: Number(row.security_deposit_amount ?? 0) || undefined,
    protection_selected: protection.protection_selected,
    protection_fee: protection.protection_fee,
    pickup_date: getString(row, "pickup_date") || undefined,
    pickup_time: getString(row, "pickup_time") || undefined,
    refund_amount: Number(row.refund_amount ?? 0) || undefined,
    refund_status: getString(row, "refund_status") || undefined,
    refund_trip_fare_amount: Number(row.refund_trip_fare_amount ?? 0) || undefined,
    refund_deposit_amount: Number(row.refund_deposit_amount ?? 0) || undefined,
    cancellation_reason:
      getString(row, "cancellation_reason") || getString(row, "cancel_reason") || undefined,
    cancelled_at: getString(row, "cancelled_at") || undefined,
    cancelled_by: getString(row, "cancelled_by") || undefined,
    cancelled_by_role: getString(row, "cancelled_by_role") || undefined,
    refund_processed_at: getString(row, "refund_processed_at") || undefined,
    booking_reference: getString(row, "booking_reference") || undefined,
    passenger_name: getString(row, "passenger_name") || undefined,
    ride_id: getString(row, "ride_id") || undefined,
    seats_booked: Number(row.seats_booked ?? 0) || undefined,
    vehicle_id: getString(row, "vehicle_id") || undefined,
    reference_id: getString(row, "reference_id") || undefined,
    mobile: getString(row, "mobile") || undefined,
  };
}

/** Load a booking by primary key `bookings.id` (UUID) for cancellation flows. */
export async function fetchBookingForCancellation(
  bookingId: string
): Promise<BookingCancellationRow | null> {
  const normalizedId = String(bookingId ?? "").trim();
  console.log("[fetchBookingForCancellation] Requested bookingId:", normalizedId);
  if (!normalizedId) return null;

  let row = await selectBookingById(normalizedId, BOOKING_CANCELLATION_COLUMN_SETS);
  if (row && getString(row as Row, "id")) {
    return mapRowToCancellationRow(row as Row);
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    console.error("[fetchBookingForCancellation] fallback select(*):", error.message);
    return null;
  }

  if (!data) {
    console.log("[fetchBookingForCancellation] No booking row for id:", normalizedId);
    return null;
  }

  row = data as Row;
  console.log("[fetchBookingForCancellation] Found booking via fallback:", getString(row, "id"));
  return mapRowToCancellationRow(row);
}

export async function bookingOwnedByUser(
  row: BookingCancellationRow,
  userId: string
): Promise<boolean> {
  if (row.user_id && row.user_id === userId) return true;
  if (!row.mobile) return false;

  const db = createAdminClient();
  const { data: userRow } = await db.from("users").select("id, mobile").eq("id", userId).maybeSingle();
  const userMobile = String((userRow as { mobile?: string } | null)?.mobile ?? "").replace(/\s/g, "");
  const bookingMobile = String(row.mobile).replace(/\s/g, "");
  return Boolean(userMobile && bookingMobile && userMobile === bookingMobile);
}
