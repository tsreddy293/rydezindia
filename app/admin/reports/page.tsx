import Link from "next/link";
import { AdminPageShell } from "@/components/admin/AdminTable";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

const REPORTS = [
  { type: "bookings", label: "Booking Report" },
  { type: "payments", label: "Revenue Report" },
  { type: "owners", label: "Owner Earnings Report" },
  { type: "vehicles", label: "Vehicle Usage Report" },
];

export default async function AdminReportsPage() {
  await requireRole("admin");

  return (
    <AdminPageShell title="Reports" description="Export marketplace reports as CSV">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((report) => (
          <div key={report.type} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-secondary">{report.label}</h2>
            <p className="mt-2 text-sm text-gray-500">Download the latest {report.label.toLowerCase()}.</p>
            <Link
              href={`/api/reports/export?type=${report.type}`}
              className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Export CSV
            </Link>
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
