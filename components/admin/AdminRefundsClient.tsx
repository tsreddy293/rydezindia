"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import RefundStatusBadge from "@/components/booking/RefundStatusBadge";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import {
  approveBookingRefund,
  processBookingRefund,
  rejectBookingRefund,
} from "@/server/actions/bookingCancellation";
import { formatDate, formatINR } from "@/lib/utils";
import type { RefundAnalytics } from "@/lib/services/booking-cancellation";

interface CancelledBookingRow {
  id: string;
  booking_reference?: string | null;
  booking_type?: string | null;
  passenger_name?: string | null;
  mobile?: string | null;
  amount?: number | null;
  refund_amount?: number | null;
  refund_status?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  pickup_date?: string | null;
  payment_status?: string | null;
  protection_selected?: boolean | null;
  flexible_cancellation?: boolean | null;
  flexible_cancellation_fee?: number | null;
}

interface Props {
  bookings: CancelledBookingRow[];
  analytics: RefundAnalytics;
}

export default function AdminRefundsClient({ bookings, analytics }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) router.refresh();
      else alert(result.error ?? "Action failed");
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Cancelled Bookings", value: analytics.totalCancelled },
          { label: "Pending Refunds", value: analytics.pendingRefunds },
          { label: "Completed Refunds", value: analytics.completedRefunds },
          { label: "Total Refunded", value: formatINR(analytics.completedRefundAmount) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-secondary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Passenger</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Protection</th>
              <th className="px-4 py-3">Refund</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cancelled</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No cancelled bookings yet.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.passenger_name ?? "Passenger"}</p>
                    {b.mobile && <p className="text-xs text-gray-500">{b.mobile}</p>}
                    <p className="text-xs text-gray-400">{b.booking_reference ?? b.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{String(b.booking_type ?? "—").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{formatINR(Number(b.amount ?? 0))}</td>
                  <td className="px-4 py-3">
                    <ProtectionStatusBadge
                      selected={b.protection_selected === true || b.flexible_cancellation === true}
                      fee={Number(b.flexible_cancellation_fee ?? 0) || undefined}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {formatINR(Number(b.refund_amount ?? 0))}
                  </td>
                  <td className="px-4 py-3">
                    <RefundStatusBadge status={b.refund_status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.cancelled_at ? formatDate(b.cancelled_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {b.refund_status === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => runAction(() => approveBookingRefund(b.id))}
                            className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => runAction(() => rejectBookingRefund(b.id))}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {b.refund_status === "approved" && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runAction(() => processBookingRefund(b.id))}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Process Refund
                        </button>
                      )}
                    </div>
                    {b.cancellation_reason && (
                      <p className="mt-1 max-w-[200px] truncate text-xs text-gray-400" title={b.cancellation_reason}>
                        {b.cancellation_reason}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
