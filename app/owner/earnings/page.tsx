import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import { getOwnerDashboardMetrics, getOwnerEarnings } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Earnings",
  description: "Track your earnings on Rydez India.",
  path: "/owner/earnings",
  noIndex: true,
});

export default async function OwnerEarningsPage() {
  const { user } = await requireRole("owner");
  const [metrics, earnings] = await Promise.all([
    getOwnerDashboardMetrics(user.id),
    getOwnerEarnings(user.id),
  ]);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Earnings</h1>

        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <div className="rounded-2xl bg-white border p-6 shadow-sm">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-3xl font-bold text-primary">{formatINR(metrics.earningsToday)}</p>
          </div>
          <div className="rounded-2xl bg-white border p-6 shadow-sm">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-3xl font-bold text-primary">{formatINR(metrics.earningsThisMonth)}</p>
          </div>
        </div>

        {earnings.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-16 text-center text-gray-500">No earnings recorded yet.</div>
        ) : (
          <div className="rounded-2xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Gross</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Platform Fee</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Net</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((row) => {
                  const e = row as Record<string, unknown>;
                  return (
                    <tr key={String(e.id)} className="border-t">
                      <td className="px-4 py-3">{formatDate(String(e.earned_at ?? e.created_at))}</td>
                      <td className="px-4 py-3">{formatINR(Number(e.gross_amount))}</td>
                      <td className="px-4 py-3">{formatINR(Number(e.platform_fee))}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{formatINR(Number(e.net_amount))}</td>
                      <td className="px-4 py-3">{String(e.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
