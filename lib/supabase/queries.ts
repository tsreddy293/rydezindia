import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type {
  ChartPoint,
  DriverVehicleResult,
  BookingConfirmation,
  OwnerDashboardMetrics,
  PlatformStats,
  OwnerStats,
  RecentBooking,
  RecentOwner,
  RecentVehicle,
  SearchResult,
  SelfDriveResult,
  UserBooking,
  VehicleDetail,
  VehicleOwner,
} from "@/types/database";
import { scoreRouteMatch } from "@/lib/services/route-matching";

const db = () => createAdminClient();

export type QueryResult<T> = {
  data: T;
  error: string | null;
};

type Row = Record<string, unknown>;

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function getString(row: Row | null | undefined, key: string, fallback = "") {
  const value = row?.[key];
  return value === null || value === undefined ? fallback : String(value);
}

function getNumber(row: Row | null | undefined, key: string, fallback = 0) {
  const value = row?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPublicListing(row: Row) {
  const status = getString(row, "status") || getString(row, "availability", "available");
  const approval = getString(row, "vehicle_approval_status", "approved");
  return status === "available" && approval === "approved";
}

function getDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  return date.toISOString().slice(0, 10);
}

function mapOwnerRow(
  row: Row & {
    user?: { name?: string; email?: string; mobile?: string; city?: string } | null;
  }
): VehicleOwner {
  return {
    id: String(row.id),
    owner_id: row.owner_id ? String(row.owner_id) : null,
    name: String(row.name ?? row.user?.name ?? row.owner_name ?? "Owner"),
    mobile: String(row.mobile ?? row.user?.mobile ?? ""),
    email: String(row.email ?? row.user?.email ?? ""),
    city: String(row.city ?? row.user?.city ?? row.address ?? ""),
    aadhaar_number: String(row.aadhaar_number ?? ""),
    license_number: String(row.license_number ?? row.driving_license_number ?? ""),
    vehicle_type: String(row.vehicle_type ?? ""),
    vehicle_number: String(row.vehicle_number ?? ""),
    vehicle_model: String(row.vehicle_model ?? row.vehicle_name ?? ""),
    seating_capacity: Number(row.seating_capacity ?? row.seats ?? 0),
    status: (row.status as VehicleOwner["status"]) ?? "pending",
    created_at: String(row.created_at ?? ""),
  };
}

async function countTable(table: string, options?: { createdAfter?: string }): Promise<number> {
  let query = db().from(table).select("id", { count: "exact", head: true });
  if (options?.createdAfter) query = query.gte("created_at", options.createdAfter);
  const { count, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return 0;
    console.error(`[countTable] ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

async function selectRows(table: string, columns = "*", limit = 100): Promise<Row[]> {
  const { data, error } = await db()
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error(`[selectRows] ${table}:`, error.message);
    return [];
  }
  return asRows(data);
}

async function getVehicleMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("vehicles")
    .select("id, owner_id, vehicle_number, vehicle_name, vehicle_type, fuel_type, transmission, seats, photos, status, has_ac, rating, vehicle_approval_status, created_at")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getVehicleMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

async function getLegacyVehicleOwnerMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("vehicle_owners")
    .select("id, owner_id, name, mobile, email, city, vehicle_type, vehicle_number, vehicle_model, seating_capacity, status, created_at")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getLegacyVehicleOwnerMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

async function getUserMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("users")
    .select("id, name, full_name, mobile, email, city")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getUserMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

function bucketTrend(rows: Row[], amountKey?: string): ChartPoint[] {
  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    const key = getDateKey(row.created_at);
    const value = amountKey ? getNumber(row, amountKey) : 1;
    buckets.set(key, (buckets.get(key) ?? 0) + value);
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([label, value]) => ({ label, value }));
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[getPlatformStats]", configError);
    return emptyStats(configError);
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    users,
    owners,
    vehicles,
    returnJourneys,
    selfDriveVehicles,
    driverVehicles,
    bookings,
    todaysBookings,
    bookingRows,
    recentVehiclesRows,
    recentOwnersRows,
    ownerKycCount,
  ] = await Promise.all([
    countTable("users"),
    countTable("owners"),
    countTable("vehicles"),
    countTable("return_journeys"),
    countTable("self_drive_vehicles"),
    countTable("driver_vehicles"),
    countTable("bookings"),
    countTable("bookings", { createdAfter: `${today}T00:00:00.000Z` }),
    selectRows("bookings", "id, booking_type, amount, booking_status, created_at", 500),
    selectRows("vehicles", "id, vehicle_name, vehicle_type, vehicle_number, status, vehicle_approval_status, created_at", 8),
    selectRows("owners", "id, owner_name, mobile, verification_status, created_at", 8),
    countTable("owner_kyc"),
  ]);

  const revenue = bookingRows.reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const returnJourneyRevenue = bookingRows
    .filter((row) => getString(row, "booking_type", "return_journey") === "return_journey")
    .reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const driverVehicleRevenue = bookingRows
    .filter((row) => getString(row, "booking_type") === "with_driver")
    .reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const selfDriveRevenue = bookingRows
    .filter((row) => getString(row, "booking_type") === "self_drive")
    .reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const monthlyRevenue = bookingRows
    .filter((row) => new Date(String(row.created_at)) >= monthStart)
    .reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const pendingApprovals =
    ownerKycCount +
    recentVehiclesRows.filter((row) => getString(row, "vehicle_approval_status", "approved") === "pending").length +
    recentOwnersRows.filter((row) => getString(row, "verification_status", "pending") === "pending").length;

  const categoryCounts = new Map<string, number>();
  recentVehiclesRows.forEach((row) => {
    const type = getString(row, "vehicle_type", "Unknown");
    categoryCounts.set(type, (categoryCounts.get(type) ?? 0) + 1);
  });

  return {
    users,
    vehicleOwners: owners,
    vehicles: returnJourneys + driverVehicles + selfDriveVehicles,
    vehiclesTableCount: vehicles,
    bookings,
    returnJourneys,
    selfDriveVehicles,
    driverVehicles,
    todaysBookings,
    revenue,
    pendingApprovals,
    returnJourneyRevenue,
    driverVehicleRevenue,
    selfDriveRevenue,
    monthlyRevenue,
    recentBookings: bookingRows.slice(0, 8).map((row) => ({
      id: getString(row, "id"),
      booking_type: getString(row, "booking_type", "return_journey"),
      amount: getNumber(row, "amount"),
      booking_status: getString(row, "booking_status", "pending"),
      created_at: getString(row, "created_at"),
    })) satisfies RecentBooking[],
    recentVehicles: recentVehiclesRows.map((row) => ({
      id: getString(row, "id"),
      vehicle_name: getString(row, "vehicle_name", getString(row, "vehicle_number", "Vehicle")),
      vehicle_type: getString(row, "vehicle_type", "Unknown"),
      vehicle_number: getString(row, "vehicle_number"),
      status: getString(row, "status", "pending"),
      created_at: getString(row, "created_at"),
    })) satisfies RecentVehicle[],
    recentOwners: recentOwnersRows.map((row) => ({
      id: getString(row, "id"),
      owner_name: getString(row, "owner_name", "Owner"),
      mobile: getString(row, "mobile"),
      verification_status: getString(row, "verification_status", "pending"),
      created_at: getString(row, "created_at"),
    })) satisfies RecentOwner[],
    revenueTrend: bucketTrend(bookingRows, "amount"),
    bookingTrend: bucketTrend(bookingRows),
    vehicleCategoryDistribution: [...categoryCounts.entries()].map(([label, value]) => ({ label, value })),
    error: null,
  };
}

function emptyStats(error: string): PlatformStats {
  return {
    users: 0,
    vehicleOwners: 0,
    vehicles: 0,
    vehiclesTableCount: 0,
    bookings: 0,
    returnJourneys: 0,
    selfDriveVehicles: 0,
    driverVehicles: 0,
    todaysBookings: 0,
    revenue: 0,
    pendingApprovals: 0,
    returnJourneyRevenue: 0,
    driverVehicleRevenue: 0,
    selfDriveRevenue: 0,
    monthlyRevenue: 0,
    recentBookings: [],
    recentVehicles: [],
    recentOwners: [],
    revenueTrend: [],
    bookingTrend: [],
    vehicleCategoryDistribution: [],
    error,
  };
}

export async function getVehicleOwners(): Promise<QueryResult<VehicleOwner[]>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { data: [], error: configError };
  }

  const { data, error } = await db()
    .from("vehicle_owners")
    .select(`
      *,
      user:users!vehicle_owners_owner_id_fkey ( name, email, mobile, city )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      const owners = await selectRows("owners", "id, owner_name, mobile, email, address, verification_status, created_at", 100);
      return {
        data: owners.map((row) =>
          mapOwnerRow({
            id: row.id,
            name: row.owner_name,
            mobile: row.mobile,
            email: row.email,
            city: row.address,
            status: row.verification_status,
            created_at: row.created_at,
          })
        ),
        error: null,
      };
    }
    console.error("[getVehicleOwners]", error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapOwnerRow(row as Parameters<typeof mapOwnerRow>[0])),
    error: null,
  };
}

export async function searchVehicles(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  return searchReturnJourneys(filters);
}

export async function searchReturnJourneys(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { data: [], error: configError };
  }

  let query = db()
    .from("return_journeys")
    .select("*")
    .eq("status", "available")
    .gt("available_seats", 0)
    .order("journey_date", { ascending: true });

  if (filters.fromCity) query = query.ilike("from_city", `%${filters.fromCity}%`);
  if (filters.toCity) query = query.ilike("to_city", `%${filters.toCity}%`);
  if (filters.date) query = query.eq("journey_date", filters.date);

  const { data, error } = await query;
  if (error) {
    console.error("[searchReturnJourneys]", error.message);
    return { data: [], error: error.message };
  }

  const rows = asRows(data).filter(isPublicListing);
  const vehicleIds = rows.map((row) => getString(row, "vehicle_id")).filter(Boolean);
  const ownerIds = rows.map((row) => getString(row, "owner_id")).filter(Boolean);
  const [vehicleMap, legacyVehicleMap, userMap] = await Promise.all([
    getVehicleMap(vehicleIds),
    getLegacyVehicleOwnerMap(vehicleIds),
    getUserMap(ownerIds),
  ]);

  let results = rows.map((row) => {
    const vehicleId = getString(row, "vehicle_id");
    const vehicle = vehicleMap.get(vehicleId) ?? legacyVehicleMap.get(vehicleId) ?? null;
    const owner = userMap.get(getString(row, "owner_id"));
    const vehicleName =
      getString(vehicle, "vehicle_name") ||
      getString(vehicle, "vehicle_model") ||
      getString(vehicle, "vehicle_number", "Vehicle");

    return {
      id: getString(row, "id"),
      booking_type: "return_journey" as const,
      vehicle_id: vehicleId,
      vehicle_name: vehicleName,
      vehicle_number: getString(vehicle, "vehicle_number"),
      vehicle_type: getString(vehicle, "vehicle_type", "-"),
      fuel_type: getString(vehicle, "fuel_type") || undefined,
      has_ac: vehicle?.has_ac !== false,
      rating: getNumber(vehicle, "rating", 4.5) || undefined,
      photos: Array.isArray(vehicle?.photos) ? (vehicle.photos as string[]) : [],
      owner_name: getString(owner, "full_name") || getString(owner, "name", "Owner"),
      from_city: getString(row, "pickup_city") || getString(row, "from_city"),
      to_city: getString(row, "drop_city") || getString(row, "to_city"),
      journey_date: getString(row, "journey_date"),
      journey_time: getString(row, "journey_time"),
      available_seats: getNumber(row, "available_seats"),
      price: getNumber(row, "price") || getNumber(row, "price_per_seat"),
      return_from_city: getString(row, "return_from_city") || undefined,
      return_to_city: getString(row, "return_to_city") || undefined,
      return_departure_time: getString(row, "return_departure_time") || undefined,
      discount_percent: getNumber(row, "discount_percent", 30) || undefined,
      driver_name: getString(row, "driver_name") || undefined,
      driver_phone: getString(row, "driver_phone") || undefined,
    };
  });

  if (filters.vehicleType) {
    results = results.filter((r) =>
      r.vehicle_type.toLowerCase().includes(filters.vehicleType!.toLowerCase())
    );
  }

  return { data: results, error: null };
}

export async function searchSelfDriveVehicles(filters: {
  city?: string;
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SelfDriveResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: [], error: configError };

  const query = db()
    .from("self_drive_vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { data: [], error: null };
    console.error("[searchSelfDriveVehicles]", error.message);
    return { data: [], error: error.message };
  }

  const rows = asRows(data);
  const [vehicleMap, ownerMap, userMap] = await Promise.all([
    getVehicleMap(rows.map((row) => getString(row, "vehicle_id"))),
    getLegacyVehicleOwnerMap(rows.map((row) => getString(row, "owner_id"))),
    getUserMap(rows.map((row) => getString(row, "owner_id"))),
  ]);

  let results = rows
    .filter(isPublicListing)
    .map((row) => {
    const vehicle = vehicleMap.get(getString(row, "vehicle_id")) ?? null;
    const owner = ownerMap.get(getString(row, "owner_id")) ?? userMap.get(getString(row, "owner_id")) ?? null;
    const photos = Array.isArray(row.photos) ? (row.photos as string[]) : [];
    const pickupCity = getString(row, "pickup_city") || getString(row, "location");
    const price = getNumber(row, "price") || getNumber(row, "daily_rent");
    return {
      id: getString(row, "id"),
      booking_type: "self_drive" as const,
      vehicle_id: getString(row, "vehicle_id"),
      vehicle_name: getString(row, "vehicle_name") || getString(vehicle, "vehicle_name", getString(vehicle, "vehicle_number", "Vehicle")),
      vehicle_type: getString(row, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
      owner_name:
        getString(owner, "owner_name") ||
        getString(owner, "name") ||
        getString(owner, "full_name", "Owner"),
      pickup_city: pickupCity,
      drop_city: getString(row, "drop_city"),
      journey_date: getString(row, "journey_date"),
      journey_time: getString(row, "journey_time"),
      available_seats: getNumber(row, "available_seats") || getNumber(vehicle, "seats") || 1,
      price,
      status: getString(row, "status") || getString(row, "availability", "available"),
      location: pickupCity,
      daily_rent: getNumber(row, "daily_rent") || price,
      security_deposit: getNumber(row, "security_deposit"),
      availability: getString(row, "availability", "available"),
      photos: photos.length > 0 ? photos : Array.isArray(vehicle?.photos) ? (vehicle?.photos as string[]) : [],
      seats: getNumber(vehicle, "seats"),
    };
  });

  const city = filters.pickupCity ?? filters.city;
  if (city) {
    results = results.filter((r) => r.pickup_city.toLowerCase().includes(city.toLowerCase()));
  }
  if (filters.dropCity) {
    results = results.filter((r) => r.drop_city.toLowerCase().includes(filters.dropCity!.toLowerCase()));
  }
  if (filters.date) {
    results = results.filter((r) => !r.journey_date || r.journey_date === filters.date);
  }
  if (filters.vehicleType) {
    results = results.filter((r) =>
      r.vehicle_type.toLowerCase().includes(filters.vehicleType!.toLowerCase())
    );
  }

  return { data: results, error: null };
}

export async function searchDriverVehicles(filters: {
  city?: string;
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  tripType?: string;
  vehicleType?: string;
}): Promise<QueryResult<DriverVehicleResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: [], error: configError };

  const query = db()
    .from("driver_vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { data: [], error: null };
    console.error("[searchDriverVehicles]", error.message);
    return { data: [], error: error.message };
  }

  const rows = asRows(data);
  const [vehicleMap, ownerMap, userMap] = await Promise.all([
    getVehicleMap(rows.map((row) => getString(row, "vehicle_id"))),
    getLegacyVehicleOwnerMap(rows.map((row) => getString(row, "owner_id"))),
    getUserMap(rows.map((row) => getString(row, "owner_id"))),
  ]);

  let results = rows
    .filter(isPublicListing)
    .map((row) => {
    const vehicle = vehicleMap.get(getString(row, "vehicle_id")) ?? null;
    const owner = ownerMap.get(getString(row, "owner_id")) ?? userMap.get(getString(row, "owner_id")) ?? null;
    const pickupCity = getString(row, "pickup_city") || getString(row, "base_location");
    const price = getNumber(row, "price") || getNumber(row, "rate_per_km");
    return {
      id: getString(row, "id"),
      booking_type: "with_driver" as const,
      vehicle_id: getString(row, "vehicle_id"),
      vehicle_name: getString(row, "vehicle_name") || getString(vehicle, "vehicle_name", getString(vehicle, "vehicle_number", "Vehicle")),
      vehicle_number: getString(vehicle, "vehicle_number") || undefined,
      vehicle_type: getString(row, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
      fuel_type: getString(vehicle, "fuel_type") || getString(row, "fuel_type") || undefined,
      has_ac: vehicle?.has_ac !== false,
      rating: getNumber(vehicle, "rating", 4.5) || undefined,
      photos: Array.isArray(vehicle?.photos) ? (vehicle.photos as string[]) : [],
      owner_name:
        getString(owner, "owner_name") ||
        getString(owner, "name") ||
        getString(owner, "full_name", "Owner"),
      owner_id: getString(row, "owner_id") || undefined,
      pickup_city: pickupCity,
      drop_city: getString(row, "drop_city"),
      journey_date: getString(row, "journey_date"),
      journey_time: getString(row, "journey_time"),
      available_seats: getNumber(row, "available_seats") || getNumber(vehicle, "seats") || 1,
      price,
      status: getString(row, "status") || getString(row, "availability", "available"),
      driver_name: getString(row, "driver_name"),
      driver_phone: getString(row, "driver_phone"),
      rate_per_km: getNumber(row, "rate_per_km") || price,
      base_location: pickupCity,
      availability: getString(row, "availability", "available"),
      seats: getNumber(vehicle, "seats"),
    };
  });

  const city = filters.pickupCity ?? filters.city;
  if (city) {
    results = results.filter((r) => r.pickup_city.toLowerCase().includes(city.toLowerCase()));
  }
  if (filters.dropCity) {
    results = results.filter((r) => r.drop_city.toLowerCase().includes(filters.dropCity!.toLowerCase()));
  }
  if (filters.date) {
    results = results.filter((r) => !r.journey_date || r.journey_date === filters.date);
  }
  if (filters.vehicleType) {
    results = results.filter((r) =>
      r.vehicle_type.toLowerCase().includes(filters.vehicleType!.toLowerCase())
    );
  }

  return { data: results, error: null };
}

export async function getJourneyById(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db()
    .from("return_journeys")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getJourneyById]", error.message);
    return null;
  }

  const journey = data as Row;
  const vehicleId = getString(journey, "vehicle_id");
  const ownerId = getString(journey, "owner_id");

  const [vehicleMap, legacyVehicleMap, userMap] = await Promise.all([
    getVehicleMap([vehicleId]),
    getLegacyVehicleOwnerMap([vehicleId]),
    getUserMap([ownerId]),
  ]);

  const vehicle = vehicleMap.get(vehicleId) ?? legacyVehicleMap.get(vehicleId) ?? null;
  const owner = userMap.get(ownerId) ?? null;

  return {
    ...journey,
    vehicle,
    owner: owner
      ? {
          id: getString(owner, "id", ownerId),
          name: getString(owner, "full_name") || getString(owner, "name", "Owner"),
          email: getString(owner, "email"),
        }
      : { id: ownerId, name: "Owner" },
  };
}

export async function getSelfDriveListingById(id: string): Promise<SelfDriveResult | null> {
  const { data, error } = await db()
    .from("self_drive_vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getSelfDriveListingById]", error.message);
    return null;
  }

  const row = data as Row;
  const [vehicleMap, ownerMap, userMap] = await Promise.all([
    getVehicleMap([getString(row, "vehicle_id")]),
    getLegacyVehicleOwnerMap([getString(row, "owner_id")]),
    getUserMap([getString(row, "owner_id")]),
  ]);
  const vehicle = vehicleMap.get(getString(row, "vehicle_id")) ?? null;
  const owner = ownerMap.get(getString(row, "owner_id")) ?? userMap.get(getString(row, "owner_id")) ?? null;
  const photos = Array.isArray(row.photos) ? (row.photos as string[]) : [];
  const pickupCity = getString(row, "pickup_city") || getString(row, "location");
  const price = getNumber(row, "price") || getNumber(row, "daily_rent");

  return {
    id: getString(row, "id"),
    booking_type: "self_drive",
    vehicle_id: getString(row, "vehicle_id"),
    vehicle_name: getString(row, "vehicle_name") || getString(vehicle, "vehicle_name", getString(vehicle, "vehicle_number", "Vehicle")),
    vehicle_type: getString(row, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
    owner_name: getString(owner, "owner_name") || getString(owner, "name") || getString(owner, "full_name", "Owner"),
    pickup_city: pickupCity,
    drop_city: getString(row, "drop_city"),
    journey_date: getString(row, "journey_date"),
    journey_time: getString(row, "journey_time"),
    available_seats: getNumber(row, "available_seats") || getNumber(vehicle, "seats") || 1,
    price,
    status: getString(row, "status") || getString(row, "availability", "available"),
    location: pickupCity,
    daily_rent: getNumber(row, "daily_rent") || price,
    security_deposit: getNumber(row, "security_deposit"),
    availability: getString(row, "availability", "available"),
    photos: photos.length > 0 ? photos : Array.isArray(vehicle?.photos) ? (vehicle?.photos as string[]) : [],
    seats: getNumber(vehicle, "seats"),
  };
}

export async function getDriverListingById(id: string): Promise<DriverVehicleResult | null> {
  const { data, error } = await db()
    .from("driver_vehicles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getDriverListingById]", error.message);
    return null;
  }

  const row = data as Row;
  const [vehicleMap, ownerMap, userMap] = await Promise.all([
    getVehicleMap([getString(row, "vehicle_id")]),
    getLegacyVehicleOwnerMap([getString(row, "owner_id")]),
    getUserMap([getString(row, "owner_id")]),
  ]);
  const vehicle = vehicleMap.get(getString(row, "vehicle_id")) ?? null;
  const owner = ownerMap.get(getString(row, "owner_id")) ?? userMap.get(getString(row, "owner_id")) ?? null;
  const pickupCity = getString(row, "pickup_city") || getString(row, "base_location");
  const price = getNumber(row, "price") || getNumber(row, "rate_per_km");

  return {
    id: getString(row, "id"),
    booking_type: "with_driver",
    vehicle_id: getString(row, "vehicle_id"),
    vehicle_name: getString(row, "vehicle_name") || getString(vehicle, "vehicle_name", getString(vehicle, "vehicle_number", "Vehicle")),
    vehicle_type: getString(row, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
    owner_name: getString(owner, "owner_name") || getString(owner, "name") || getString(owner, "full_name", "Owner"),
    pickup_city: pickupCity,
    drop_city: getString(row, "drop_city"),
    journey_date: getString(row, "journey_date"),
    journey_time: getString(row, "journey_time"),
    available_seats: getNumber(row, "available_seats") || getNumber(vehicle, "seats") || 1,
    price,
    status: getString(row, "status") || getString(row, "availability", "available"),
    driver_name: getString(row, "driver_name"),
    driver_phone: getString(row, "driver_phone"),
    rate_per_km: getNumber(row, "rate_per_km") || price,
    base_location: pickupCity,
    availability: getString(row, "availability", "available"),
    seats: getNumber(vehicle, "seats"),
  };
}

export async function getVehicleListingById(id: string): Promise<VehicleDetail | null> {
  const journey = await getJourneyById(id);
  if (journey) {
    const vehicle = journey.vehicle as Row | null;
    const owner = journey.owner as Row | null;
    return {
      id: getString(journey, "id"),
      module: "return_journey",
      booking_type: "return_journey",
      vehicle_id: getString(journey, "vehicle_id"),
      vehicle_name:
        getString(journey, "vehicle_name") ||
        getString(vehicle, "vehicle_name") ||
        getString(vehicle, "vehicle_model") ||
        getString(vehicle, "vehicle_number", "Vehicle"),
      vehicle_type: getString(journey, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
      owner_name: getString(owner, "name", "Owner"),
      from_city: getString(journey, "pickup_city") || getString(journey, "from_city"),
      to_city: getString(journey, "drop_city") || getString(journey, "to_city"),
      journey_date: getString(journey, "journey_date"),
      journey_time: getString(journey, "journey_time"),
      available_seats: getNumber(journey, "available_seats"),
      price: getNumber(journey, "price") || getNumber(journey, "price_per_seat"),
      price_label: "per seat",
    };
  }

  const driver = await getDriverListingById(id);
  if (driver) return { ...driver, module: "with_driver", price_label: "full vehicle" };

  const selfDrive = await getSelfDriveListingById(id);
  if (selfDrive) return { ...selfDrive, module: "self_drive", price_label: "per day" };

  return null;
}

export async function getBookingConfirmationById(id: string): Promise<BookingConfirmation | null> {
  const { data, error } = await db()
    .from("bookings")
    .select("id, booking_reference, booking_type, passenger_name, mobile, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, trip_type, vehicle_id, owner_id, created_at")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getBookingConfirmationById]", error.message);
    return null;
  }

  const row = data as Row;
  return {
    id: getString(row, "id"),
    booking_reference: getString(row, "booking_reference") || undefined,
    booking_type: getString(row, "booking_type", "return_journey"),
    passenger_name: getString(row, "passenger_name", "Passenger"),
    mobile: getString(row, "mobile"),
    amount: getNumber(row, "amount"),
    booking_status: getString(row, "booking_status", "pending"),
    payment_status: getString(row, "payment_status", "pending"),
    pickup_location: getString(row, "pickup_location") || undefined,
    drop_location: getString(row, "drop_location") || undefined,
    pickup_date: getString(row, "pickup_date") || undefined,
    pickup_time: getString(row, "pickup_time") || undefined,
    trip_type: getString(row, "trip_type") || undefined,
    vehicle_id: getString(row, "vehicle_id") || undefined,
    owner_id: getString(row, "owner_id") || undefined,
    created_at: getString(row, "created_at"),
  };
}

export async function getAdminRows(table: string, columns = "*", limit = 50): Promise<Row[]> {
  return selectRows(table, columns, limit);
}

export async function getOwnerStats(ownerId: string): Promise<OwnerStats> {
  const stats = await getPlatformStats();
  const [vehicles, returnJourneys, driverVehicles, selfDriveVehicles, bookings, payments] = await Promise.all([
    selectRows("vehicles", "id, owner_id, vehicle_make, vehicle_model, vehicle_year, registration_number, vehicle_category, approval_status, created_at", 500),
    selectRows("return_journeys", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows("driver_vehicles", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows("self_drive_vehicles", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows("bookings", "id, owner_id, amount, booking_status, created_at", 500),
    selectRows("payments", "id, owner_id, amount, status, created_at", 500),
  ]);

  const ownerVehicles = [...vehicles, ...returnJourneys, ...driverVehicles, ...selfDriveVehicles].filter(
    (row) => getString(row, "owner_id") === ownerId
  );
  const ownerBookings = bookings.filter((row) => getString(row, "owner_id") === ownerId);
  const ownerPayments = payments.filter((row) => getString(row, "owner_id") === ownerId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const revenueRows = ownerPayments.length > 0 ? ownerPayments : ownerBookings;
  const revenue = revenueRows.reduce((sum, row) => sum + getNumber(row, "amount"), 0);
  const monthlyRevenue = revenueRows
    .filter((row) => new Date(getString(row, "created_at")) >= monthStart)
    .reduce((sum, row) => sum + getNumber(row, "amount"), 0);

  return {
    ...stats,
    vehicles: ownerVehicles.length,
    vehiclesTableCount: vehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    returnJourneys: returnJourneys.filter((row) => getString(row, "owner_id") === ownerId).length,
    driverVehicles: driverVehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    selfDriveVehicles: selfDriveVehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    bookings: ownerBookings.length,
    revenue,
    monthlyRevenue,
    activeVehicles: ownerVehicles.filter((row) => isPublicListing(row)).length,
    bookingRequests: ownerBookings.filter((row) => getString(row, "booking_status", "pending") === "pending").length,
    recentVehicles: vehicles
      .filter((row) => getString(row, "owner_id") === ownerId)
      .slice(0, 8)
      .map((row) => {
        const make = getString(row, "vehicle_make");
        const model = getString(row, "vehicle_model");
        const year = getString(row, "vehicle_year");
        const name =
          make && model
            ? `${make} ${model}${year ? ` (${year})` : ""}`
            : getString(row, "vehicle_name", getString(row, "registration_number", "Vehicle"));
        return {
          id: getString(row, "id"),
          vehicle_name: name,
          vehicle_type: getString(row, "vehicle_category", getString(row, "vehicle_type", "Unknown")),
          vehicle_number: getString(row, "registration_number", getString(row, "vehicle_number")),
          status: getString(row, "approval_status", getString(row, "status", "pending")),
          created_at: getString(row, "created_at"),
        };
      }),
    recentBookings: ownerBookings.slice(0, 8).map((row) => ({
      id: getString(row, "id"),
      booking_type: getString(row, "booking_type", "booking"),
      amount: getNumber(row, "amount"),
      booking_status: getString(row, "booking_status", "pending"),
      created_at: getString(row, "created_at"),
    })),
    revenueTrend: bucketTrend(revenueRows, "amount"),
    bookingTrend: bucketTrend(ownerBookings),
  };
}

export async function getOwnerDashboardMetrics(ownerId: string): Promise<OwnerDashboardMetrics> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [vehicles, bookings, earnings] = await Promise.all([
    selectRows("vehicles", "id, owner_id, approval_status", 500),
    selectRows("bookings", "id, owner_id, booking_status, pickup_date, amount, created_at", 500),
    selectRows("owner_earnings", "id, owner_id, net_amount, earned_at, created_at", 500),
  ]);

  const ownerVehicles = vehicles.filter((r) => getString(r, "owner_id") === ownerId);
  const approvedVehicles = ownerVehicles.filter(
    (r) => getString(r, "approval_status", getString(r, "vehicle_approval_status")) === "approved"
  ).length;
  const pendingVehicles = ownerVehicles.filter((r) => {
    const status = getString(r, "approval_status", getString(r, "vehicle_approval_status", "pending"));
    return status === "pending";
  }).length;
  const ownerBookings = bookings.filter((r) => getString(r, "owner_id") === ownerId);
  const ownerEarnings = earnings.filter((r) => getString(r, "owner_id") === ownerId);

  const activeBookings = ownerBookings.filter(
    (r) => ["pending", "confirmed"].includes(getString(r, "booking_status"))
  ).length;

  const upcomingTrips = ownerBookings.filter((r) => {
    const status = getString(r, "booking_status");
    const pickupDate = getString(r, "pickup_date");
    return status === "confirmed" && pickupDate && new Date(pickupDate) >= today;
  }).length;

  const earningsToday = ownerEarnings
    .filter((r) => new Date(getString(r, "earned_at", getString(r, "created_at"))) >= today)
    .reduce((sum, r) => sum + getNumber(r, "net_amount"), 0);

  const earningsThisMonth = ownerEarnings
    .filter((r) => new Date(getString(r, "earned_at", getString(r, "created_at"))) >= monthStart)
    .reduce((sum, r) => sum + getNumber(r, "net_amount"), 0);

  return {
    totalVehicles: ownerVehicles.length,
    approvedVehicles,
    pendingVehicles,
    activeBookings,
    upcomingTrips,
    earningsToday,
    earningsThisMonth,
  };
}

export async function getOwnerBookings(ownerId: string): Promise<UserBooking[]> {
  const rows = await selectRows(
    "bookings",
    "id, owner_id, booking_reference, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, created_at",
    100
  );
  return rows
    .filter((r) => getString(r, "owner_id") === ownerId)
    .map((row) => ({
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
      created_at: getString(row, "created_at"),
    }));
}

export async function getUserBookings(userId: string): Promise<UserBooking[]> {
  const rows = await selectRows(
    "bookings",
    "id, user_id, booking_reference, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, created_at",
    100
  );
  return rows
    .filter((r) => getString(r, "user_id") === userId)
    .map((row) => ({
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
      created_at: getString(row, "created_at"),
    }));
}

export async function getSavedVehicles(userId: string) {
  const { data, error } = await db()
    .from("saved_vehicles")
    .select("*, vehicles(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function searchReturnJourneysWithMatch(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  const result = await searchReturnJourneys(filters);
  if (!filters.fromCity || !filters.toCity) return result;

  const matched = result.data.filter((journey) =>
    scoreRouteMatch({
      searchFrom: filters.fromCity!,
      searchTo: filters.toCity!,
      listingFrom: journey.from_city,
      listingTo: journey.to_city,
    }) >= 50
  );

  // Cache matches in route_matches table (fire-and-forget)
  const dbClient = db();
  for (const journey of matched) {
    dbClient.from("route_matches").upsert({
      return_journey_id: journey.id,
      search_from_city: filters.fromCity,
      search_to_city: filters.toCity,
      match_score: scoreRouteMatch({
        searchFrom: filters.fromCity!,
        searchTo: filters.toCity!,
        listingFrom: journey.from_city,
        listingTo: journey.to_city,
      }),
    }).then(() => {});
  }

  return { data: matched.length > 0 ? matched : result.data, error: null };
}

export async function getReturnJourneyMarketplace(filters?: {
  from?: string;
  to?: string;
  date?: string;
}) {
  return searchReturnJourneys({
    fromCity: filters?.from,
    toCity: filters?.to,
    date: filters?.date,
  });
}

export async function getOwnerEarnings(ownerId: string) {
  const rows = await selectRows("owner_earnings", "*", 200);
  return rows.filter((r) => getString(r, "owner_id") === ownerId);
}

export async function getVehicleDocumentsForAdmin(vehicleId: string) {
  const { data, error } = await db()
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId);
  if (error) return [];
  return data ?? [];
}
