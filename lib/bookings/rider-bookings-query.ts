import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import {
  BOOKING_RIDER_COLUMN_SETS,
  deriveProtectionFields,
} from "@/lib/bookings/booking-select";
import {
  parseReturnScheduleFromInstructions,
  resolveVehicleImage,
} from "@/lib/bookings/my-bookings-utils";
import { getVehicleImages } from "@/lib/services/vehicle-upload";
import { buildVehicleDisplayName } from "@/lib/vehicles/search";
import type { MyBookingRecord } from "@/types/database";

type Row = Record<string, unknown>;
type DbClient = ReturnType<typeof createAdminClient>;

const BOOKING_COLUMN_SETS = BOOKING_RIDER_COLUMN_SETS;

function asRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data as Row[];
}

function getString(row: Row | null | undefined, key: string, fallback = ""): string {
  const value = row?.[key];
  return value === null || value === undefined ? fallback : String(value);
}

function getNumber(row: Row | null | undefined, key: string, fallback = 0): number {
  const parsed = Number(row?.[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function queryBookings(
  db: DbClient,
  columns: string,
  filter: { type: "user_id"; value: string } | { type: "mobile"; value: string } | { type: "ids"; value: string[] },
  limit: number
): Promise<Row[] | null> {
  let query = db
    .from("bookings")
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter.type === "user_id") {
    query = query.eq("user_id", filter.value);
  } else if (filter.type === "mobile") {
    query = query.eq("mobile", filter.value);
  } else {
    query = query.in("id", filter.value);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingColumnError(error)) return null;
    console.error("[fetchRiderBookingRows]", error.message);
    return [];
  }
  return asRows(data);
}

async function fetchByUserIdColumn(userId: string, limit: number): Promise<Row[]> {
  const db = createAdminClient();
  for (const columns of BOOKING_COLUMN_SETS) {
    if (!columns.includes("user_id")) continue;
    const rows = await queryBookings(db, columns, { type: "user_id", value: userId }, limit);
    if (rows !== null) return rows;
  }
  return [];
}

async function fetchByMobile(mobile: string, limit: number): Promise<Row[]> {
  const normalized = mobile.replace(/\s/g, "");
  if (!normalized) return [];

  const db = createAdminClient();
  for (const columns of BOOKING_COLUMN_SETS) {
    if (!columns.includes("mobile")) continue;
    const rows = await queryBookings(db, columns, { type: "mobile", value: normalized }, limit);
    if (rows !== null) return rows;
  }
  return [];
}

async function fetchByPaymentUserId(userId: string, limit: number): Promise<Row[]> {
  const db = createAdminClient();
  const { data: payments, error } = await db
    .from("payments")
    .select("booking_id")
    .eq("user_id", userId)
    .not("booking_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !payments?.length) return [];

  const bookingIds = [
    ...new Set(
      payments
        .map((p) => (p as { booking_id?: string }).booking_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (bookingIds.length === 0) return [];

  for (const columns of BOOKING_COLUMN_SETS) {
    const rows = await queryBookings(db, columns, { type: "ids", value: bookingIds }, limit);
    if (rows !== null) return rows;
  }
  return [];
}

export async function fetchRiderBookingRows(userId: string, limit = 100): Promise<Row[]> {
  const byUserId = await fetchByUserIdColumn(userId, limit);
  if (byUserId.length > 0) return byUserId;

  const db = createAdminClient();
  const { data: userRow } = await db.from("users").select("id, mobile").eq("id", userId).maybeSingle();
  const mobile = getString(userRow as Row | null, "mobile");

  const byMobile = mobile ? await fetchByMobile(mobile, limit) : [];
  if (byMobile.length > 0) {
    await backfillBookingUserIds(
      byMobile.map((row) => getString(row, "id")).filter(Boolean),
      userId
    );
    return byMobile;
  }

  const byPayment = await fetchByPaymentUserId(userId, limit);
  if (byPayment.length > 0) {
    await backfillBookingUserIds(
      byPayment.map((row) => getString(row, "id")).filter(Boolean),
      userId
    );
    return byPayment;
  }

  return [];
}

async function backfillBookingUserIds(bookingIds: string[], userId: string) {
  if (bookingIds.length === 0) return;
  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({ user_id: userId })
    .in("id", bookingIds)
    .is("user_id", null);
  if (error && !isMissingColumnError(error, "user_id")) {
    console.warn("[backfillBookingUserIds]", error.message);
  }
}

async function resolveVehicleMapForBookings(rows: Row[]): Promise<Map<string, Row>> {
  const vehicleIds = [
    ...new Set(
      rows.flatMap((row) => [getString(row, "vehicle_id"), getString(row, "reference_id")]).filter(Boolean)
    ),
  ];
  if (vehicleIds.length === 0) return new Map();

  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select(
      "id, owner_id, vehicle_number, vehicle_name, vehicle_type, vehicle_make, vehicle_model, vehicle_year, photos, vehicle_photo_url"
    )
    .in("id", vehicleIds);

  const map = new Map<string, Row>();
  if (!error) {
    for (const row of asRows(data)) {
      map.set(getString(row, "id"), row);
    }
  }

  const missing = vehicleIds.filter((id) => !map.has(id));
  if (missing.length > 0) {
    for (const table of ["self_drive_vehicles", "driver_vehicles"] as const) {
      const { data: listings } = await db
        .from(table)
        .select("id, owner_id, vehicle_id, vehicle_name, vehicle_type, photos")
        .in("id", missing);
      for (const listing of asRows(listings)) {
        const listingId = getString(listing, "id");
        if (!listingId || map.has(listingId)) continue;
        map.set(listingId, {
          id: listingId,
          vehicle_name: getString(listing, "vehicle_name", "Vehicle"),
          vehicle_type: getString(listing, "vehicle_type"),
          photos: listing.photos,
          owner_id: getString(listing, "owner_id"),
          vehicle_id: getString(listing, "vehicle_id"),
        });
      }
    }
  }

  return map;
}

async function resolveVehicleImageUrl(
  vehicleRow: Row | undefined,
  vehicleId: string
): Promise<string | null> {
  const fromRow = resolveVehicleImage(vehicleRow ?? null);
  if (fromRow) return fromRow;
  if (!vehicleId) return null;
  const images = await getVehicleImages(vehicleId);
  return images[0] ?? null;
}

function mapRowToMyBookingRecord(
  row: Row,
  vehicleMap: Map<string, Row>,
  vehicleImage: string | null
): MyBookingRecord {
  const vehicleId = getString(row, "vehicle_id") || getString(row, "reference_id");
  let vehicleRow = vehicleId ? vehicleMap.get(vehicleId) : undefined;

  const linkedVehicleId = getString(vehicleRow, "vehicle_id");
  if (linkedVehicleId && vehicleMap.has(linkedVehicleId)) {
    vehicleRow = vehicleMap.get(linkedVehicleId) ?? vehicleRow;
  }

  const returnSchedule = parseReturnScheduleFromInstructions(getString(row, "special_instructions"));
  const vehicleName =
    (vehicleRow ? buildVehicleDisplayName(vehicleRow) : "") ||
    getString(vehicleRow, "vehicle_name") ||
    getString(row, "booking_type", "Vehicle").replace(/_/g, " ");
  const protection = deriveProtectionFields(row);

  return {
    id: getString(row, "id"),
    booking_reference: getString(row, "booking_reference") || undefined,
    booking_type: getString(row, "booking_type", "booking"),
    passenger_name: getString(row, "passenger_name", "Passenger"),
    amount: getNumber(row, "amount"),
    booking_status: getString(row, "booking_status", "pending"),
    payment_status: getString(row, "payment_status", "pending"),
    pickup_location: getString(row, "pickup_location") || undefined,
    drop_location: getString(row, "drop_location") || undefined,
    pickup_date: getString(row, "pickup_date") || undefined,
    pickup_time: getString(row, "pickup_time") || undefined,
    created_at: getString(row, "created_at"),
    cancellation_status: getString(row, "cancellation_status") || undefined,
    cancelled_at: getString(row, "cancelled_at") || undefined,
    refund_amount: getNumber(row, "refund_amount") || undefined,
    refund_status: getString(row, "refund_status") || undefined,
    refund_processed_at: getString(row, "refund_processed_at") || undefined,
    cancellation_reason: getString(row, "cancellation_reason") || undefined,
    cancellation_charges: getNumber(row, "cancellation_charges") || undefined,
    ...protection,
    vehicle_id: getString(row, "vehicle_id") || undefined,
    reference_id: getString(row, "reference_id") || undefined,
    vehicle_name: vehicleName,
    vehicle_type: getString(vehicleRow, "vehicle_type") || undefined,
    vehicle_image: vehicleImage,
    return_date: returnSchedule.returnDate,
    return_time: returnSchedule.returnTime,
    return_location: getString(row, "drop_location") || undefined,
    special_instructions: getString(row, "special_instructions") || undefined,
  };
}

export async function getMyBookingsForRider(userId: string, limit = 100): Promise<MyBookingRecord[]> {
  const rows = await fetchRiderBookingRows(userId, limit);
  if (rows.length === 0) return [];

  const vehicleMap = await resolveVehicleMapForBookings(rows);

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const lookupId = getString(row, "vehicle_id") || getString(row, "reference_id");
      const vehicleRow = lookupId ? vehicleMap.get(lookupId) : undefined;
      const imageId = getString(vehicleRow, "id") || getString(row, "vehicle_id") || lookupId;
      const vehicleImage = await resolveVehicleImageUrl(vehicleRow, imageId);
      return mapRowToMyBookingRecord(row, vehicleMap, vehicleImage);
    })
  );

  return mapped.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
