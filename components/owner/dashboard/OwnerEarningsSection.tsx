import Link from "next/link";
import DashboardChart from "@/components/admin/dashboard/DashboardChart";
import { formatINR } from "@/lib/utils";
import type { OwnerDashboardData } from "@/lib/owner/dashboard-types";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";
import { IndianRupee } from "lucide-react";

export default function OwnerEarningsSection({
  earnings,
  walletBalance,
}: {
  earnings: OwnerDashboardData["earnings"];
  walletBalance: number;
}) {
  const hasEarnings = earnings.lifetime > 0;

  return (
    <OwnerSection
      title="Earnings"
      description="Revenue and wallet summary"
      action={
        <Link href="/owner/earnings" className="text-sm font-semibold text-primary hover:underline">
          Full details →
        </Link>
      }
    >
      {!hasEarnings ? (
        <OwnerEmptyState
          icon={IndianRupee}
          title="No Earnings Yet"
          description="Complete your first trip to start earning. Earnings will appear here automatically."
          actionLabel="View Bookings"
          actionHref="/owner/bookings"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Today", value: earnings.today },
              { label: "This Week", value: earnings.week },
              { label: "This Month", value: earnings.month },
              { label: "Lifetime", value: earnings.lifetime },
              { label: "Pending Payments", value: earnings.pendingSettlement },
              { label: "Wallet Balance", value: walletBalance },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/50 p-4 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-500">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-secondary">{formatINR(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5">
            <div>
              <p className="text-sm text-gray-600">Ready to withdraw</p>
              <p className="text-2xl font-bold text-emerald-800">{formatINR(walletBalance)}</p>
            </div>
            <Link
              href="/owner/earnings"
              className="rounded-xl bg-gradient-to-r from-secondary to-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              Withdraw Earnings
            </Link>
          </div>
        </>
      )}
    </OwnerSection>
  );
}

export function OwnerReportsSection({ reports }: { reports: OwnerDashboardData["reports"] }) {
  return (
    <OwnerSection title="Revenue & Analytics" description="Trends and fleet performance">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-secondary">Daily / Monthly Revenue</h3>
          <DashboardChart data={reports.revenueTrend} valueFormatter={(v) => formatINR(v)} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-secondary">Booking Trend</h3>
          <DashboardChart data={reports.bookingTrend} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Vehicle Utilization</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{reports.utilizationPercent}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
              style={{ width: `${reports.utilizationPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Cancellation Rate</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{reports.cancellationRate}%</p>
        </div>
        {reports.topVehicle && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Top Performing Service</p>
            <p className="mt-1 font-bold capitalize text-secondary">{reports.topVehicle.name}</p>
            <p className="text-sm text-gray-500">{reports.topVehicle.bookings} bookings</p>
          </div>
        )}
      </div>
    </OwnerSection>
  );
}
