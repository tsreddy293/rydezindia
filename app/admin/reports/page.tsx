import Link from "next/link";
import { AdminPageShell } from "@/components/admin/AdminTable";
import { getAnalyticsReport, analyticsToCsv } from "@/lib/services/analytics";
import { requireRole } from "@/server/actions/auth";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRole("admin");
  const report = await getAnalyticsReport();

  return (
    <AdminPageShell title="Reports & Analytics" description="Revenue, utilization, and top performers">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/api/reports/export?type=analytics&format=csv`}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Export CSV
        </Link>
        <Link
          href={`/api/reports/export?type=analytics&format=pdf`}
          className="rounded-xl border px-4 py-2 text-sm font-medium text-secondary"
        >
          Export PDF
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Daily Revenue</p>
          <p className="text-2xl font-bold text-primary">{formatINR(report.dailyRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Monthly Revenue</p>
          <p className="text-2xl font-bold text-primary">{formatINR(report.monthlyRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Vehicle Utilization</p>
          <p className="text-2xl font-bold">{report.vehicleUtilization}%</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-2xl font-bold">{report.totalBookings}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold mb-4">Top Routes</h3>
          {report.topRoutes.map((r) => (
            <div key={r.route} className="flex justify-between py-2 border-b text-sm">
              <span>{r.route}</span>
              <span className="font-medium">{r.count}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold mb-4">Top Vehicles</h3>
          {report.topVehicles.map((v) => (
            <div key={v.id} className="flex justify-between py-2 border-b text-sm">
              <span>{v.name}</span>
              <span className="font-medium">{v.bookings}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold mb-4">Top Owners</h3>
          {report.topOwners.map((o) => (
            <div key={o.id} className="flex justify-between py-2 border-b text-sm">
              <span>{o.name}</span>
              <span className="font-medium">{o.bookings}</span>
            </div>
          ))}
        </section>
      </div>
    </AdminPageShell>
  );
}
