"use client";

import RefundStatusBadge from "@/components/booking/RefundStatusBadge";
import { formatDate, formatINR } from "@/lib/utils";
import type { ProtectionAnalytics } from "@/lib/services/protection-analytics";

interface RefundRow {
  id: string;
  booking_reference?: string | null;
  passenger_name?: string | null;
  protection_fee?: number | null;
  flexible_cancellation_fee?: number | null;
  protection_plan_name?: string | null;
  protection_status?: string | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  cancelled_at?: string | null;
}

interface Props {
  analytics: ProtectionAnalytics;
  refundReport: RefundRow[];
}

export default function AdminProtectionClient({ analytics, refundReport }: Props) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Protection Sales", value: analytics.totalProtectionSales },
          { label: "Protection Revenue", value: formatINR(analytics.protectionRevenue) },
          { label: "Adoption Rate", value: `${analytics.protectionAdoptionRate}%` },
          { label: "Active Protection", value: analytics.activeProtectionCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-secondary">{stat.value}</p>
          </div>
        ))}
      </div>

      {analytics.topCategory && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <p className="text-sm text-gray-600">Most purchased vehicle category</p>
          <p className="text-xl font-bold text-emerald-800">
            {analytics.topCategory.category} · {analytics.topCategory.count} plans sold
          </p>
        </div>
      )}

      <section>
        <h3 className="text-lg font-semibold text-secondary mb-4">Sales by Vehicle Category</h3>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Plans Sold</th>
                <th className="px-4 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analytics.categoryBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No protection sales yet.
                  </td>
                </tr>
              ) : (
                analytics.categoryBreakdown.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 font-medium">{row.category}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{formatINR(row.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-secondary mb-4">Recent Protected Bookings</h3>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Protection Active</th>
                <th className="px-4 py-3">Protection Fee</th>
                <th className="px-4 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analytics.recentProtectedBookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.booking_reference ?? b.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{b.passenger_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-800">
                      {(b.protection_status ?? "active").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatINR(b.protection_fee)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{b.protection_plan_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-secondary mb-4">Protection Refund Reports</h3>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Plan Fee</th>
                <th className="px-4 py-3">Refund</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Cancelled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {refundReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No protected cancellations yet.
                  </td>
                </tr>
              ) : (
                refundReport.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.booking_reference ?? String(row.id).slice(0, 8)}</td>
                    <td className="px-4 py-3">{row.passenger_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {formatINR(Number(row.protection_fee ?? row.flexible_cancellation_fee ?? 0))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {formatINR(Number(row.refund_amount ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <RefundStatusBadge status={row.refund_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.cancelled_at ? formatDate(row.cancelled_at) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
