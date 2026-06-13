import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { PlatformStats, SearchResult, VehicleOwner } from "@/types/database";

const db = () => createAdminClient();

export type QueryResult<T> = {
  data: T;
  error: string | null;
};

function mapOwnerRow(
  row: Record<string, unknown> & {
    user?: { name?: string; email?: string; mobile?: string; city?: string } | null;
  }
): VehicleOwner {
  return {
    id: String(row.id),
    owner_id: row.owner_id ? String(row.owner_id) : null,
    name: String(row.name ?? row.user?.name ?? "Owner"),
    mobile: String(row.mobile ?? row.user?.mobile ?? ""),
    email: String(row.email ?? row.user?.email ?? ""),
    city: String(row.city ?? row.user?.city ?? ""),
    aadhaar_number: String(row.aadhaar_number ?? ""),
    license_number: String(row.license_number ?? row.driving_license_number ?? ""),
    vehicle_type: String(row.vehicle_type ?? ""),
    vehicle_number: String(row.vehicle_number ?? ""),
    vehicle_model: String(row.vehicle_model ?? ""),
    seating_capacity: Number(row.seating_capacity ?? 0),
    status: (row.status as VehicleOwner["status"]) ?? "pending",
    created_at: String(row.created_at ?? ""),
  };
}

/** Live platform statistics */
export async function getPlatformStats(): Promise<PlatformStats> {
  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[getPlatformStats]", configError);
    return {
      users: 0,
      vehicleOwners: 0,
      vehicles: 0,
      vehiclesTableCount: 0,
      bookings: 0,
      returnJourneys: 0,
      revenue: 0,
      error: configError,
    };
  }

  const client = db();

  const [usersRes, ownersRes, bookingsRes, journeysRes, revenueRes, vehiclesRes] =
    await Promise.all([
      client.from("users").select("id", { count: "exact", head: true }),
      client.from("vehicle_owners").select("id", { count: "exact", head: true }),
      client.from("bookings").select("id", { count: "exact", head: true }),
      client.from("return_journeys").select("id", { count: "exact", head: true }),
      client.from("bookings").select("amount"),
      client.from("vehicles").select("id", { count: "exact", head: true }),
    ]);

  const ownerCount = ownersRes.count ?? 0;
  const bookingCount = bookingsRes.count ?? 0;
  const journeyCount = journeysRes.count ?? 0;
  const vehiclesTableCount = vehiclesRes.error ? 0 : (vehiclesRes.count ?? 0);

  /** Total Vehicles = active listings (return_journeys) + vehicles table rows */
  const vehicleCount = journeyCount + vehiclesTableCount;

  const revenue =
    (revenueRes.data as { amount: number }[] | null)?.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0
    ) ?? 0;

  console.log("[getPlatformStats]");
  console.log("[getPlatformStats] owners:", ownerCount);
  console.log("[getPlatformStats] vehicles:", vehicleCount);
  console.log("[getPlatformStats] returnJourneys:", journeyCount);
  console.log("[getPlatformStats] bookings:", bookingCount);
  if (vehiclesRes.error) {
    console.log("[getPlatformStats] vehicles table error:", vehiclesRes.error.message);
  } else {
    console.log("[getPlatformStats] vehicles table count:", vehiclesTableCount);
  }

  if (usersRes.error) console.error("[getPlatformStats] users:", usersRes.error.message);
  if (ownersRes.error) console.error("[getPlatformStats] owners error:", ownersRes.error.message);
  if (bookingsRes.error) console.error("[getPlatformStats] bookings error:", bookingsRes.error.message);
  if (journeysRes.error) console.error("[getPlatformStats] journeys error:", journeysRes.error.message);

  return {
    users: usersRes.count ?? 0,
    vehicleOwners: ownerCount,
    vehicles: vehicleCount,
    vehiclesTableCount,
    bookings: bookingCount,
    returnJourneys: journeyCount,
    revenue,
    error: null,
  };
}

/** Fetch vehicle owners for dropdown — joins users when name column missing */
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
    console.error("[getVehicleOwners]", error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapOwnerRow(row as Parameters<typeof mapOwnerRow>[0])),
    error: null,
  };
}

/** Search vehicles — uses vehicles table, falls back to return_journeys */
export async function searchVehicles(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { data: [], error: configError };
  }

  // Try vehicles table first
  let query = db()
    .from("vehicles")
    .select(`
      id,
      vehicle_type,
      vehicle_number,
      seats,
      from_city,
      to_city,
      price,
      owner:vehicle_owners!vehicles_owner_id_fkey (
        name,
        user:users!vehicle_owners_owner_id_fkey ( name )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters.fromCity) query = query.ilike("from_city", `%${filters.fromCity}%`);
  if (filters.toCity) query = query.ilike("to_city", `%${filters.toCity}%`);
  if (filters.vehicleType) query = query.ilike("vehicle_type", `%${filters.vehicleType}%`);

  const { data, error } = await query;

  if (!error && data && data.length > 0) {
    type VehicleRow = {
      id: string;
      vehicle_type: string;
      vehicle_number: string;
      seats: number;
      from_city: string;
      to_city: string;
      price: number;
      owner: { name?: string; user?: { name?: string } } | null;
    };

    return {
      data: (data as VehicleRow[]).map((v) => {
        const ownerName = v.owner?.name ?? v.owner?.user?.name ?? "Owner";
        return {
          id: v.id,
          vehicle_name: `${v.vehicle_type} — ${v.vehicle_number}`,
          vehicle_type: v.vehicle_type,
          owner_name: ownerName,
          from_city: v.from_city ?? "—",
          to_city: v.to_city ?? "—",
          journey_date: filters.date ?? new Date().toISOString().split("T")[0],
          available_seats: Number(v.seats ?? 0),
          price: Number(v.price ?? 0),
        };
      }),
      error: null,
    };
  }

  if (error && !error.message.includes("Could not find the table")) {
    console.error("[searchVehicles] vehicles:", error.message);
  }

  // Fallback: search return_journeys (always available in current DB)
  return searchReturnJourneys(filters);
}

async function searchReturnJourneys(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  let query = db()
    .from("return_journeys")
    .select(`
      id,
      from_city,
      to_city,
      journey_date,
      available_seats,
      price_per_seat,
      vehicle:vehicle_owners!return_journeys_vehicle_id_fkey (
        vehicle_type,
        vehicle_number,
        vehicle_model
      ),
      owner:users!return_journeys_owner_id_fkey ( name )
    `)
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

  type Row = {
    id: string;
    from_city: string;
    to_city: string;
    journey_date: string;
    available_seats: number;
    price_per_seat: number;
    vehicle: { vehicle_type: string; vehicle_number: string; vehicle_model: string } | { vehicle_type: string; vehicle_number: string; vehicle_model: string }[] | null;
    owner: { name: string } | { name: string }[] | null;
  };

  function first<T>(val: T | T[] | null | undefined): T | null {
    if (!val) return null;
    return Array.isArray(val) ? val[0] ?? null : val;
  }

  let results = ((data ?? []) as unknown as Row[]).map((row) => {
    const vehicle = first(row.vehicle);
    const owner = first(row.owner);
    return {
      id: row.id,
      vehicle_name: vehicle?.vehicle_model ?? vehicle?.vehicle_number ?? "Vehicle",
      vehicle_type: vehicle?.vehicle_type ?? "—",
      owner_name: owner?.name ?? "Owner",
      from_city: row.from_city,
      to_city: row.to_city,
      journey_date: row.journey_date,
      available_seats: row.available_seats,
      price: Number(row.price_per_seat),
    };
  });

  if (filters.vehicleType) {
    results = results.filter((r) =>
      r.vehicle_type.toLowerCase().includes(filters.vehicleType!.toLowerCase())
    );
  }

  return { data: results, error: null };
}

/** Get return journey by ID for booking page */
export async function getJourneyById(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db()
    .from("return_journeys")
    .select(`
      *,
      vehicle:vehicle_owners!return_journeys_vehicle_id_fkey ( vehicle_type, vehicle_number, vehicle_model ),
      owner:users!return_journeys_owner_id_fkey ( id, name, email )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getJourneyById]", error.message);
    return null;
  }
  return data;
}
