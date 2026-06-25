import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";

type Row = Record<string, unknown>;
type DbClient = ReturnType<typeof createAdminClient>;

const BOOKING_CORE =
  "id, booking_reference, booking_type, passenger_name, mobile, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, trip_type, vehicle_id, owner_id, user_id, created_at, reference_id, special_instructions";

const BOOKING_CANCELLATION =
  "cancellation_status, cancelled_at, refund_amount, refund_status, refund_processed_at, cancellation_reason, cancellation_charges, refund_trip_fare_amount, refund_deposit_amount, flexible_cancellation, flexible_cancellation_fee";

const BOOKING_PROTECTION =
  "protection_selected, protection_fee, protection_plan_name, protection_purchase_date, protection_status";

const BOOKING_FARE = "trip_fare_amount, security_deposit_amount";

const BOOKING_RETURN =
  "ride_id, seats_booked, refund_trip_fare_amount, refund_deposit_amount";

function joinColumns(...groups: string[]): string {
  return groups.join(", ");
}

/** Booking confirmation / invoice / details page */
export const BOOKING_CONFIRMATION_COLUMN_SETS = [
  joinColumns(BOOKING_CORE, BOOKING_CANCELLATION, BOOKING_PROTECTION, BOOKING_FARE),
  joinColumns(BOOKING_CORE, BOOKING_CANCELLATION, BOOKING_FARE),
  joinColumns(BOOKING_CORE, "flexible_cancellation, flexible_cancellation_fee", BOOKING_FARE),
  BOOKING_CORE,
] as const;

/** Rider My Bookings list */
export const BOOKING_RIDER_COLUMN_SETS = [
  joinColumns(
    BOOKING_CORE,
    BOOKING_CANCELLATION,
    BOOKING_PROTECTION,
    "vehicle_id, reference_id"
  ),
  joinColumns(BOOKING_CORE, BOOKING_CANCELLATION, "vehicle_id, reference_id"),
  joinColumns(BOOKING_CORE, "vehicle_id, reference_id"),
  joinColumns(
    "id, user_id, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, created_at, mobile"
  ),
] as const;

/** Admin bookings list */
export const BOOKING_ADMIN_LIST_COLUMN_SETS = [
  joinColumns(
    "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, created_at",
    BOOKING_PROTECTION,
    "flexible_cancellation, flexible_cancellation_fee"
  ),
  "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, flexible_cancellation, flexible_cancellation_fee, created_at",
  "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, created_at",
] as const;

/** Cancellation service — minimal tiers last so schema gaps never block lookup. */
export const BOOKING_CANCELLATION_COLUMN_SETS = [
  joinColumns(
    "id, user_id, owner_id, booking_type, trip_type, booking_status, payment_status, mobile",
    BOOKING_CANCELLATION,
    BOOKING_PROTECTION,
    BOOKING_FARE,
    BOOKING_RETURN,
    "pickup_date, pickup_time, booking_reference, passenger_name, vehicle_id, reference_id"
  ),
  joinColumns(
    "id, user_id, owner_id, booking_type, trip_type, booking_status, payment_status, mobile",
    "flexible_cancellation, pickup_date, pickup_time, refund_amount, refund_status, refund_trip_fare_amount, refund_deposit_amount, cancellation_reason, cancelled_at, cancelled_by, cancelled_by_role, refund_processed_at, booking_reference, passenger_name, ride_id, seats_booked, amount, vehicle_id, reference_id",
    BOOKING_FARE
  ),
  "id, user_id, owner_id, booking_type, booking_status, payment_status, amount, pickup_date, pickup_time, booking_reference, passenger_name, vehicle_id, reference_id, mobile",
  "id, user_id, booking_type, booking_status, payment_status, amount, pickup_date, pickup_time, booking_reference, passenger_name, mobile",
  "id, user_id, booking_status, payment_status, amount, mobile, cancel_reason, cancelled_at, cancelled_by, cancelled_by_role",
] as const;

/** Protection analytics */
export const BOOKING_PROTECTION_ANALYTICS_COLUMN_SETS = [
  joinColumns(
    "id, booking_reference, passenger_name, booking_type, created_at, vehicle_id",
    BOOKING_PROTECTION,
    "flexible_cancellation, flexible_cancellation_fee"
  ),
  "id, booking_reference, passenger_name, booking_type, flexible_cancellation, flexible_cancellation_fee, created_at, vehicle_id",
  "id, booking_reference, passenger_name, booking_type, created_at, vehicle_id",
] as const;

export const BOOKING_PROTECTION_REFUND_COLUMN_SETS = [
  joinColumns(
    "id, booking_reference, passenger_name, refund_amount, refund_status, cancelled_at, cancellation_status, booking_status",
    BOOKING_PROTECTION,
    "flexible_cancellation, flexible_cancellation_fee"
  ),
  "id, booking_reference, passenger_name, flexible_cancellation, flexible_cancellation_fee, refund_amount, refund_status, cancelled_at, cancellation_status, booking_status",
  "id, booking_reference, passenger_name, refund_amount, refund_status, cancelled_at, cancellation_status, booking_status",
] as const;

export const BOOKING_CANCELLED_LIST_COLUMN_SETS = [
  joinColumns(
    "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancellation_reason, cancelled_at, pickup_date, payment_status",
    BOOKING_PROTECTION,
    "flexible_cancellation, flexible_cancellation_fee"
  ),
  "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancellation_reason, cancelled_at, pickup_date, payment_status, flexible_cancellation, flexible_cancellation_fee",
  "id, booking_reference, booking_type, passenger_name, mobile, amount, refund_amount, refund_status, cancellation_reason, cancelled_at, pickup_date, payment_status",
] as const;

export function deriveProtectionFields(row: Row) {
  const flexibleCancellation = row.flexible_cancellation === true;
  const protectionSelected =
    row.protection_selected === true || flexibleCancellation;

  return {
    protection_selected: protectionSelected,
    flexible_cancellation: flexibleCancellation,
    flexible_cancellation_fee:
      Number(row.flexible_cancellation_fee ?? 0) || undefined,
    protection_fee:
      Number(row.protection_fee ?? row.flexible_cancellation_fee ?? 0) || undefined,
    protection_plan_name:
      row.protection_plan_name != null
        ? String(row.protection_plan_name)
        : undefined,
    protection_purchase_date:
      row.protection_purchase_date != null
        ? String(row.protection_purchase_date)
        : undefined,
    protection_status:
      row.protection_status != null ? String(row.protection_status) : undefined,
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
