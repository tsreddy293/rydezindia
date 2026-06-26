import nextDynamic from "next/dynamic";
import { getOwnerDashboardMetrics, getOwnerStats } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";

const OwnerReportsHub = nextDynamic(() => import("@/components/owner/reports/OwnerReportsHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Reports",
  description: "Fleet performance and revenue reports on Rydez India.",
  path: "/owner/reports",
  noIndex: true,
});

export default async function OwnerReportsPage() {
  const { user } = await requireRole("owner");
  const [stats, metrics, vehicles] = await Promise.all([
    getOwnerStats(user.id),
    getOwnerDashboardMetrics(user.id),
    getOwnerVehiclesList(user.id),
  ]);

  const occupancy =
    metrics.totalVehicles > 0
      ? Math.round((metrics.activeBookings / metrics.totalVehicles) * 100)
      : 0;

  const bookings = stats.recentBookings ?? [];
  const cancelled = bookings.filter((b) => b.booking_status?.toLowerCase() === "cancelled").length;
  const cancellationRate = bookings.length > 0 ? Math.round((cancelled / bookings.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Enterprise analytics & exports</p>
      </div>
      <OwnerReportsHub
        revenueTrend={stats.revenueTrend ?? []}
        bookingTrend={stats.bookingTrend ?? []}
        topVehicle={null}
        cancellationRate={cancellationRate}
        occupancy={occupancy}
        monthlyRevenue={stats.monthlyRevenue ?? metrics.earningsThisMonth}
        vehicleCount={vehicles.length}
      />
    </div>
  );
}
