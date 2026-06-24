"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import CancelBookingButton from "@/components/booking/CancelBookingButton";
import RefundStatusBadge from "@/components/booking/RefundStatusBadge";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import { REFUND_PROCESSING_ESTIMATE } from "@/lib/services/cancellation-policy";
import { formatDate, formatINR } from "@/lib/utils";
import type { UserBookingExtended } from "@/types/database";

interface Props {
  bookings: UserBookingExtended[];
  refundHistory: UserBookingExtended[];
}

export default function UserBookingsClient({ bookings, refundHistory }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-secondary mb-4">Active & Past Bookings</h2>
        {bookings.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-50">
            <p className="text-gray-500 mb-4">No bookings yet.</p>
            <Button href="/search" variant="primary">
              Search Vehicles
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isCancelled =
                b.cancellation_status === "cancelled" || b.booking_status.toLowerCase() === "cancelled";
              return (
                <div
                  key={b.id}
                  className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:flex-wrap justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{b.booking_reference ?? b.id.slice(0, 8)}</p>
                      {b.refund_status && <RefundStatusBadge status={b.refund_status} />}
                      {(b.protection_selected || b.flexible_cancellation) && (
                        <ProtectionStatusBadge
                          selected
                          fee={b.flexible_cancellation_fee ?? undefined}
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 capitalize">
                      {b.booking_type.replace(/_/g, " ")} · {formatDate(b.created_at)}
                    </p>
                    {b.pickup_location && (
                      <p className="text-sm mt-1 text-gray-600">
                        {b.pickup_location}
                        {b.drop_location ? ` → ${b.drop_location}` : ""}
                      </p>
                    )}
                    {b.pickup_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Scheduled: {formatDate(b.pickup_date)}
                        {b.pickup_time ? ` at ${b.pickup_time}` : ""}
                      </p>
                    )}
                    {isCancelled && b.refund_amount != null && (
                      <p className="text-sm mt-2 text-emerald-700">
                        Refund: {formatINR(b.refund_amount)}
                        {b.refund_status === "pending" && (
                          <span className="block text-xs text-gray-500 mt-0.5">{REFUND_PROCESSING_ESTIMATE}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    <p className="font-bold text-primary text-right">{formatINR(b.amount)}</p>
                    <p className="text-xs text-gray-500 text-right capitalize">{b.booking_status}</p>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button href={`/booking/confirmation/${b.id}`} variant="outline" size="sm">
                        View
                      </Button>
                      <CancelBookingButton
                        bookingId={b.id}
                        bookingStatus={b.booking_status}
                        cancellationStatus={b.cancellation_status}
                        onCancelled={() => router.refresh()}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {refundHistory.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-secondary mb-4">Refund History</h2>
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Cancelled</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {refundHistory.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">{row.booking_reference ?? row.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.cancelled_at ? formatDate(row.cancelled_at) : "—"}
                    </td>
                    <td className="px-4 py-3">{formatINR(row.refund_amount ?? 0)}</td>
                    <td className="px-4 py-3">
                      <RefundStatusBadge status={row.refund_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
