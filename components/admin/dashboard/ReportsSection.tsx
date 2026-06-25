import Link from "next/link";
import { BarChart3 } from "lucide-react";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import { formatINR } from "@/lib/utils";
import type { AdminDashboardData } from "@/lib/admin/dashboard-types";

export default function ReportsSection({ reports }: { reports: AdminDashboardData["reports"] }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-secondary">Reports</h2>
          <p className="text-sm text-gray-500">Trends and top performers</p>
        </div>
        <Link
          href="/admin/reports"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-secondary hover:bg-gray-50"
        >
          Full Reports
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-secondary">
            <BarChart3 className="h-4 w-4 text-primary" />
            Revenue Chart
          </h3>
          <DashboardChart data={reports.revenueTrend} valueFormatter={(v) => formatINR(v)} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-secondary">
            <BarChart3 className="h-4 w-4 text-primary" />
            Booking Trend
          </h3>
          <DashboardChart data={reports.bookingTrend} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-secondary">Top Cities</h3>
          <DashboardChart data={reports.topCities} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-secondary">Top Owners</h3>
          <DashboardChart data={reports.topOwners} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-secondary">Vehicle Categories</h3>
          <DashboardChart data={reports.vehicleCategories} />
        </div>
      </div>
    </section>
  );
}
