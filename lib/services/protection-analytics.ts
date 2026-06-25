import { createAdminClient } from "@/lib/supabase/admin";
import {
  BOOKING_PROTECTION_ANALYTICS_COLUMN_SETS,
  BOOKING_PROTECTION_REFUND_COLUMN_SETS,
  deriveProtectionFields,
  selectBookingsWithFilter,
} from "@/lib/bookings/booking-select";
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
  const rows = await selectBookingsWithFilter(BOOKING_PROTECTION_ANALYTICS_COLUMN_SETS, (columns) => {
    const db = createAdminClient();
    return db
      .from("bookings")
      .select(columns)
      .eq("booking_type", "self_drive")
      .order("created_at", { ascending: false })
      .limit(500);
  });

  const selfDriveTotal = rows.length;

  const protectedRows = rows.filter((row) => deriveProtectionFields(row).protection_selected);

  let protectionRevenue = 0;
  const categoryMap = new Map<ProtectionVehicleCategory, { count: number; revenue: number }>();

  for (const row of protectedRows) {
    const protection = deriveProtectionFields(row);
    const fee = protection.protection_fee ?? 0;
    protectionRevenue += fee;
    const cat = categoryFromPlanName(protection.protection_plan_name, null);
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

  const activeProtectionCount = protectedRows.filter((row) => {
    const status = deriveProtectionFields(row).protection_status ?? "active";
    return status === "active";
  }).length;

  return {
    totalProtectionSales: protectedRows.length,
    protectionRevenue,
    protectionAdoptionRate:
      selfDriveTotal > 0 ? Math.round((protectedRows.length / selfDriveTotal) * 100) : 0,
    totalEligibleBookings: selfDriveTotal,
    activeProtectionCount,
    usedOrCancelledCount: protectedRows.filter((row) => {
      const status = deriveProtectionFields(row).protection_status ?? "";
      return ["used", "cancelled", "expired"].includes(status);
    }).length,
    topCategory: topCategory
      ? { category: topCategory.category, count: topCategory.count }
      : null,
    categoryBreakdown,
    recentProtectedBookings: protectedRows.slice(0, 20).map((row) => {
      const protection = deriveProtectionFields(row);
      return {
        id: String(row.id),
        booking_reference: row.booking_reference as string | undefined,
        passenger_name: row.passenger_name as string | undefined,
        protection_fee: protection.protection_fee ?? 0,
        protection_plan_name: protection.protection_plan_name,
        protection_status: protection.protection_status ?? "active",
        created_at: row.created_at as string | undefined,
      };
    }),
  };
}

export async function getProtectionRefundReport(limit = 50) {
  const rows = await selectBookingsWithFilter(BOOKING_PROTECTION_REFUND_COLUMN_SETS, async (columns) => {
    const db = createAdminClient();
    const withProtectionFilter = await db
      .from("bookings")
      .select(columns)
      .or("protection_selected.eq.true,flexible_cancellation.eq.true")
      .order("cancelled_at", { ascending: false })
      .limit(limit);

    if (!withProtectionFilter.error) {
      return withProtectionFilter;
    }

    return db
      .from("bookings")
      .select(columns)
      .eq("flexible_cancellation", true)
      .order("cancelled_at", { ascending: false })
      .limit(limit);
  });

  return rows
    .filter(
      (row) =>
        String(row.cancellation_status) === "cancelled" ||
        String(row.booking_status) === "cancelled"
    )
    .map((row) => {
      const protection = deriveProtectionFields(row);
      return {
        id: String(row.id),
        booking_reference: (row.booking_reference as string | null) ?? undefined,
        passenger_name: (row.passenger_name as string | null) ?? undefined,
        protection_fee: protection.protection_fee ?? null,
        flexible_cancellation_fee: protection.flexible_cancellation_fee ?? null,
        protection_plan_name: protection.protection_plan_name ?? null,
        protection_status: protection.protection_status ?? null,
        refund_amount: Number(row.refund_amount ?? 0) || null,
        refund_status: (row.refund_status as string | null) ?? undefined,
        cancelled_at: (row.cancelled_at as string | null) ?? undefined,
      };
    });
}
