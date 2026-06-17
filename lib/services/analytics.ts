import { createAdminClient } from "@/lib/supabase/admin";

export async function getAnalyticsReport() {
  const db = createAdminClient();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const [bookings, payments, vehicles, owners, users] = await Promise.all([
    db.from("bookings").select("id, amount, booking_status, pickup_location, drop_location, owner_id, vehicle_id, created_at"),
    db.from("payments").select("id, amount, status, created_at").eq("status", "paid"),
    db.from("vehicles").select("id, vehicle_name, vehicle_type, status"),
    db.from("owners").select("id, owner_name"),
    db.from("users").select("id, role"),
  ]);

  const bookingRows = bookings.data ?? [];
  const paymentRows = payments.data ?? [];

  const dailyRevenue = paymentRows
    .filter((p) => String((p as { created_at: string }).created_at) >= dayStart)
    .reduce((s, p) => s + Number((p as { amount: number }).amount), 0);

  const monthlyRevenue = paymentRows
    .filter((p) => String((p as { created_at: string }).created_at) >= monthStart)
    .reduce((s, p) => s + Number((p as { amount: number }).amount), 0);

  const routeCounts = new Map<string, number>();
  for (const b of bookingRows) {
    const row = b as { pickup_location?: string; drop_location?: string };
    if (row.pickup_location && row.drop_location) {
      const key = `${row.pickup_location} → ${row.drop_location}`;
      routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
    }
  }

  const topRoutes = [...routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  const vehicleBookingCounts = new Map<string, number>();
  for (const b of bookingRows) {
    const vid = String((b as { vehicle_id?: string }).vehicle_id ?? "");
    if (vid) vehicleBookingCounts.set(vid, (vehicleBookingCounts.get(vid) ?? 0) + 1);
  }

  const vehicleMap = new Map(
    (vehicles.data ?? []).map((v) => [String((v as { id: string }).id), v as Record<string, unknown>])
  );

  const topVehicles = [...vehicleBookingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      name: String(vehicleMap.get(id)?.vehicle_name ?? "Vehicle"),
      bookings: count,
    }));

  const ownerBookingCounts = new Map<string, number>();
  for (const b of bookingRows) {
    const oid = String((b as { owner_id?: string }).owner_id ?? "");
    if (oid) ownerBookingCounts.set(oid, (ownerBookingCounts.get(oid) ?? 0) + 1);
  }

  const ownerMap = new Map(
    (owners.data ?? []).map((o) => [String((o as { id: string }).id), o as Record<string, unknown>])
  );

  const topOwners = [...ownerBookingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      id,
      name: String(ownerMap.get(id)?.owner_name ?? "Owner"),
      bookings: count,
    }));

  const totalVehicles = vehicles.data?.length ?? 0;
  const bookedVehicles = new Set(bookingRows.map((b) => (b as { vehicle_id?: string }).vehicle_id).filter(Boolean)).size;
  const utilization = totalVehicles > 0 ? Math.round((bookedVehicles / totalVehicles) * 100) : 0;

  return {
    dailyRevenue,
    monthlyRevenue,
    totalBookings: bookingRows.length,
    totalUsers: (users.data ?? []).filter((u) => (u as { role: string }).role === "user").length,
    totalOwners: owners.data?.length ?? 0,
    totalVehicles,
    vehicleUtilization: utilization,
    topRoutes,
    topVehicles,
    topOwners,
  };
}

export function analyticsToCsv(report: Awaited<ReturnType<typeof getAnalyticsReport>>) {
  const lines = [
    "Metric,Value",
    `Daily Revenue,${report.dailyRevenue}`,
    `Monthly Revenue,${report.monthlyRevenue}`,
    `Total Bookings,${report.totalBookings}`,
    `Vehicle Utilization,${report.vehicleUtilization}%`,
    "",
    "Top Routes,Count",
    ...report.topRoutes.map((r) => `"${r.route}",${r.count}`),
    "",
    "Top Vehicles,Bookings",
    ...report.topVehicles.map((v) => `"${v.name}",${v.bookings}`),
    "",
    "Top Owners,Bookings",
    ...report.topOwners.map((o) => `"${o.name}",${o.bookings}`),
  ];
  return lines.join("\n");
}
