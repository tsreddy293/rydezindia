import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeVehicleCategory,
  PROTECTION_CATEGORY_LABELS,
  type ProtectionVehicleCategory,
} from "@/lib/services/flexible-cancellation-protection";

export interface ProtectionAnalytics {
  totalProtectionSales: number;
  protectionRevenue: number;
  protectionAdoptionRate: number;
  totalEligibleBookings: number;
  activeProtectionCount: number;
  usedOrCancelledCount: number;
  topCategory: { category: string; count: number } | null;
  categoryBreakdown: Array<{ category: string; count: number; revenue: number }>;
  recentProtectedBookings: Array<{
    id: string;
    booking_reference?: string;
    passenger_name?: string;
    protection_fee: number;
    protection_plan_name?: string;
    protection_status?: string;
    created_at?: string;
  }>;
}

function categoryFromPlanName(planName?: string | null, vehicleType?: string | null): ProtectionVehicleCategory {
  if (vehicleType) return normalizeVehicleCategory(vehicleType);
  const name = String(planName ?? "").toLowerCase();
  if (name.includes("luxury")) return "luxury";
  if (name.includes("premium")) return "premium_suv";
  if (name.includes("compact")) return "compact_suv";
  if (name.includes("suv")) return "suv";
  if (name.includes("sedan")) return "sedan";
  return "hatchback";
}

export async function getProtectionAnalytics(): Promise<ProtectionAnalytics> {
  const db = createAdminClient();
  const { data: bookings } = await db
    .from("bookings")
    .select(
      "id, booking_reference, passenger_name, booking_type, protection_selected, flexible_cancellation, protection_fee, flexible_cancellation_fee, protection_plan_name, protection_status, created_at, vehicle_id"
    )
    .eq("booking_type", "self_drive")
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = bookings ?? [];
  const selfDriveTotal = rows.length;

  const protectedRows = rows.filter(
    (r) => r.protection_selected === true || r.flexible_cancellation === true
  );

  let protectionRevenue = 0;
  const categoryMap = new Map<ProtectionVehicleCategory, { count: number; revenue: number }>();

  for (const row of protectedRows) {
    const fee = Number(row.protection_fee ?? row.flexible_cancellation_fee ?? 0);
    protectionRevenue += fee;
    const cat = categoryFromPlanName(row.protection_plan_name as string, null);
    const existing = categoryMap.get(cat) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += fee;
    categoryMap.set(cat, existing);
  }

  const categoryBreakdown = [...categoryMap.entries()]
    .map(([cat, stats]) => ({
      category: PROTECTION_CATEGORY_LABELS[cat],
      count: stats.count,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.count - a.count);

  const topCategory = categoryBreakdown[0] ?? null;

  const activeProtectionCount = protectedRows.filter(
    (r) => String(r.protection_status ?? "active") === "active"
  ).length;

  return {
    totalProtectionSales: protectedRows.length,
    protectionRevenue,
    protectionAdoptionRate:
      selfDriveTotal > 0 ? Math.round((protectedRows.length / selfDriveTotal) * 100) : 0,
    totalEligibleBookings: selfDriveTotal,
    activeProtectionCount,
    usedOrCancelledCount: protectedRows.filter((r) =>
      ["used", "cancelled", "expired"].includes(String(r.protection_status ?? ""))
    ).length,
    topCategory: topCategory
      ? { category: topCategory.category, count: topCategory.count }
      : null,
    categoryBreakdown,
    recentProtectedBookings: protectedRows.slice(0, 20).map((r) => ({
      id: String(r.id),
      booking_reference: r.booking_reference as string | undefined,
      passenger_name: r.passenger_name as string | undefined,
      protection_fee: Number(r.protection_fee ?? r.flexible_cancellation_fee ?? 0),
      protection_plan_name: r.protection_plan_name as string | undefined,
      protection_status: (r.protection_status as string | undefined) ?? "active",
      created_at: r.created_at as string | undefined,
    })),
  };
}

export async function getProtectionRefundReport(limit = 50) {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select(
      "id, booking_reference, passenger_name, protection_selected, flexible_cancellation, protection_fee, flexible_cancellation_fee, protection_plan_name, protection_status, refund_amount, refund_status, cancelled_at, cancellation_status, booking_status"
    )
    .or("protection_selected.eq.true,flexible_cancellation.eq.true")
    .order("cancelled_at", { ascending: false })
    .limit(limit);

  return (data ?? []).filter(
    (row) =>
      String(row.cancellation_status) === "cancelled" ||
      String(row.booking_status) === "cancelled"
  );
}
