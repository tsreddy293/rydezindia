import Link from "next/link";
import { Eye, MessageCircle, MapPin } from "lucide-react";
import type { OwnerDashboardBooking } from "@/lib/owner/dashboard-types";
import { OWNER_STATUS_STYLES, resolveBookingStatusKind } from "@/lib/owner/owner-status-styles";
import { formatDate, formatINR } from "@/lib/utils";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";
import { Calendar } from "lucide-react";

export default function OwnerUpcomingBookingsTable({ bookings }: { bookings: OwnerDashboardBooking[] }) {
  return (
    <OwnerSection
      title="Upcoming Bookings"
      description="Scheduled pickups and active trips"
      action={
        <Link href="/owner/bookings" className="text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      }
    >
      {bookings.length === 0 ? (
        <OwnerEmptyState
          icon={Calendar}
          title="No Upcoming Bookings"
          description="New booking requests will appear here when customers book your vehicles."
          actionLabel="View Bookings"
          actionHref="/owner/bookings"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Pickup</th>
                  <th className="px-4 py-3">Return</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => {
                  const kind = resolveBookingStatusKind(b.bookingStatus, b.paymentStatus);
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-secondary">{b.bookingReference}</td>
                      <td className="px-4 py-3">{b.passengerName}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{b.bookingType}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-gray-600">
                        {b.pickupLocation ?? "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-gray-600">
                        {b.dropLocation ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">{formatINR(b.amount)}</td>
                      <td className="px-4 py-3 capitalize">{b.paymentStatus}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                          {kind}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href="/owner/bookings"
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-secondary hover:text-white"
                          >
                            <Eye className="h-3 w-3" /> View
                          </Link>
                          <a
                            href={`tel:`}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-primary hover:text-white"
                          >
                            <MessageCircle className="h-3 w-3" /> Contact
                          </a>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-400">
                            <MapPin className="h-3 w-3" /> Track
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </OwnerSection>
  );
}
