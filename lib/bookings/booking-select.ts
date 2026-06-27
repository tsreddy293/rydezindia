import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { parseProtectionFromInstructions } from "@/lib/bookings/protection-instructions";
import {
  BOOKING_OPTIONAL_CANCELLATION_EXTENDED,
  BOOKING_OPTIONAL_FARE,
  BOOKING_OPTIONAL_PROTECTION,
  BOOKING_OPTIONAL_REFUND,
  BOOKING_PRODUCTION_CANCELLATION,
  BOOKING_PRODUCTION_CORE,
  BOOKING_PRODUCTION_RETURN,
  joinBookingColumns,
} from "@/lib/bookings/production-booking-schema";

type Row = Record<string, unknown>;

const BOOKING_CANCELLATION_OPTIONAL = joinBookingColumns(
  BOOKING_OPTIONAL_REFUND,
  BOOKING_OPTIONAL_CANCELLATION_EXTENDED
);

/** Booking confirmation / invoice / details page — production columns first. */
export const BOOKING_CONFIRMATION_COLUMN_SETS = [
  joinBookingColumns(BOOKING_PRODUCTION_CORE, BOOKING_PRODUCTION_CANCELLATION, BOOKING_OPTIONAL_FARE),
  joinBookingColumns(BOOKING_PRODUCTION_CORE, BOOKING_PRODUCTION_CANCELLATION),
  joinBookingColumns(
    BOOKING_PRODUCTION_CORE,
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_CANCELLATION_OPTIONAL,
    BOOKING_OPTIONAL_FARE
  ),
  joinBookingColumns(
    BOOKING_PRODUCTION_CORE,
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_CANCELLATION_OPTIONAL,
    BOOKING_OPTIONAL_PROTECTION,
    BOOKING_OPTIONAL_FARE
  ),
  BOOKING_PRODUCTION_CORE,
] as const;

/** Rider My Bookings list */
export const BOOKING_RIDER_COLUMN_SETS = [
  joinBookingColumns(
    BOOKING_PRODUCTION_CORE,
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_OPTIONAL_REFUND,
    BOOKING_OPTIONAL_PROTECTION,
    "vehicle_id, reference_id"
  ),
  joinBookingColumns(
    BOOKING_PRODUCTION_CORE,
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_OPTIONAL_REFUND,
    "vehicle_id, reference_id"
  ),
  joinBookingColumns(BOOKING_PRODUCTION_CORE, BOOKING_PRODUCTION_CANCELLATION, "vehicle_id, reference_id"),
  joinBookingColumns(BOOKING_PRODUCTION_CORE, "vehicle_id, reference_id"),
  joinBookingColumns(
    "id, user_id, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, created_at, mobile"
  ),
] as const;

/** Owner hub bookings list */
export const BOOKING_OWNER_COLUMN_SETS = [
  joinBookingColumns(
    "id, owner_id, booking_reference, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, created_at",
    "cancel_reason, refund_status"
  ),
  "id, owner_id, booking_reference, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, created_at",
  "id, owner_id, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, created_at",
] as const;

/** Admin bookings list */
export const BOOKING_ADMIN_LIST_COLUMN_SETS = [
  joinBookingColumns(
    "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, created_at",
    BOOKING_OPTIONAL_PROTECTION
  ),
  "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, created_at",
] as const;

/** Cancellation service — production tier first, extended tiers last. */
export const BOOKING_CANCELLATION_COLUMN_SETS = [
  joinBookingColumns(
    "id, user_id, owner_id, booking_type, trip_type, booking_status, payment_status, mobile",
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_OPTIONAL_FARE,
    BOOKING_PRODUCTION_RETURN,
    "pickup_date, pickup_time, booking_reference, passenger_name, vehicle_id, reference_id, special_instructions"
  ),
  joinBookingColumns(
    "id, user_id, owner_id, booking_type, trip_type, booking_status, payment_status, mobile",
    BOOKING_PRODUCTION_CANCELLATION,
    BOOKING_CANCELLATION_OPTIONAL,
    BOOKING_OPTIONAL_PROTECTION,
    BOOKING_OPTIONAL_FARE,
    BOOKING_PRODUCTION_RETURN,
    "pickup_date, pickup_time, booking_reference, passenger_name, vehicle_id, reference_id, special_instructions"
  ),
  "id, user_id, owner_id, booking_type, booking_status, payment_status, amount, pickup_date, pickup_time, booking_reference, passenger_name, vehicle_id, reference_id, mobile, special_instructions",
  "id, user_id, booking_type, booking_status, payment_status, amount, pickup_date, pickup_time, booking_reference, passenger_name, mobile",
  joinBookingColumns(
    "id, user_id, booking_status, payment_status, amount, mobile",
    BOOKING_PRODUCTION_CANCELLATION
  ),
] as const;

/** Protection analytics */
export const BOOKING_PROTECTION_ANALYTICS_COLUMN_SETS = [
  joinBookingColumns(
    "id, booking_reference, passenger_name, booking_type, booking_status, payment_status, refund_status, created_at, vehicle_id, special_instructions, amount",
    BOOKING_OPTIONAL_PROTECTION
  ),
  "id, booking_reference, passenger_name, booking_type, booking_status, payment_status, created_at, vehicle_id, special_instructions, amount",
] as const;

export const BOOKING_PROTECTION_REFUND_COLUMN_SETS = [
  joinBookingColumns(
    "id, booking_reference, passenger_name, refund_amount, refund_status, cancelled_at, booking_status, special_instructions",
    BOOKING_OPTIONAL_PROTECTION
  ),
  "id, booking_reference, passenger_name, refund_amount, refund_status, cancelled_at, booking_status, special_instructions",
] as const;

export const BOOKING_CANCELLED_LIST_COLUMN_SETS = [
  joinBookingColumns(
    "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancel_reason, cancelled_at, pickup_date, payment_status, special_instructions",
    BOOKING_OPTIONAL_PROTECTION
  ),
  "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancel_reason, cancelled_at, pickup_date, payment_status, special_instructions",
  "id, booking_reference, booking_type, passenger_name, mobile, amount, cancel_reason, cancelled_at, pickup_date, payment_status",
] as const;

export function deriveProtectionFields(row: Row) {
  const fromInstructions = parseProtectionFromInstructions(
    String(row.special_instructions ?? "")
  );

  const dbSelected = row.protection_selected === true;
  const dbFee = Number(row.protection_fee ?? 0) || undefined;

  const protectionSelected = dbSelected || fromInstructions.selected;
  const protectionFee =
    dbFee && dbFee > 0 ? dbFee : fromInstructions.selected ? fromInstructions.fee : undefined;

  return {
    protection_selected: protectionSelected,
    protection_fee: protectionFee,
    protection_plan_name:
      row.protection_plan_name != null
        ? String(row.protection_plan_name)
        : protectionSelected
          ? "Flexible Cancellation Protection"
          : undefined,
    protection_purchase_date:
      row.protection_purchase_date != null
        ? String(row.protection_purchase_date)
        : undefined,
    protection_status:
      row.protection_status != null
        ? String(row.protection_status)
        : protectionSelected
          ? "active"
          : undefined,
  };
}

async function queryWithColumnFallback(
  columnSets: readonly string[],
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message?: string; code?: string } | null;
  }>,
  logLabel: string
): Promise<Row[] | Row | null> {
  for (const columns of columnSets) {
    const { data, error } = await run(columns);
    if (!error) {
      return data as Row[] | Row | null;
    }
    if (isMissingColumnError(error)) {
      continue;
    }
    console.error(`[${logLabel}]`, error.message);
    return null;
  }
  return null;
}

export async function selectBookingById(
  id: string,
  columnSets: readonly string[] = BOOKING_CONFIRMATION_COLUMN_SETS
): Promise<Row | null> {
  const db = createAdminClient();
  const result = await queryWithColumnFallback(
    columnSets,
    (columns) => db.from("bookings").select(columns).eq("id", id).maybeSingle(),
    "selectBookingById"
  );
  return (result as Row | null) ?? null;
}

export async function selectBookingsList(
  columnSets: readonly string[],
  limit: number
): Promise<Row[]> {
  const db = createAdminClient();
  const result = await queryWithColumnFallback(
    columnSets,
    (columns) =>
      db.from("bookings").select(columns).order("created_at", { ascending: false }).limit(limit),
    "selectBookingsList"
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function selectBookingsWithFilter(
  columnSets: readonly string[],
  buildQuery: (
    columns: string
  ) => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>
): Promise<Row[]> {
  const result = await queryWithColumnFallback(columnSets, buildQuery, "selectBookingsWithFilter");
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

export async function selectBookingsWithRequestedColumns(
  requestedColumns: string,
  limit: number
): Promise<Row[]> {
  const columnSets = [
    requestedColumns,
    ...BOOKING_RIDER_COLUMN_SETS.filter((set) => set !== requestedColumns),
  ];
  const db = createAdminClient();
  const result = await queryWithColumnFallback(
    columnSets,
    (columns) =>
      db.from("bookings").select(columns).order("created_at", { ascending: false }).limit(limit),
    "selectBookingsWithRequestedColumns"
  );
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}
