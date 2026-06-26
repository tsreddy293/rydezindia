import Link from "next/link";
import type { RiderDashboardBooking } from "@/lib/rider/dashboard-types";
import RiderStatusBadge from "@/components/rider/dashboard/RiderStatusBadge";
import { formatDate, formatINR } from "@/lib/utils";

export default function RecentBookingsSection({ bookings }: { bookings: RiderDashboardBooking[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-secondary">Recent Bookings</h2>
        <Link href="/dashboard/bookings" className="text-sm font-medium text-primary hover:underline">
          View All
        </Link>
      </div>
      {bookings.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No bookings yet.</p>
          <Link href="/search" className="mt-3 inline-block text-sm font-semibold text-primary">
            Book your first ride →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-secondary">{b.bookingReference}</p>
                  <RiderStatusBadge
                    bookingStatus={b.bookingStatus}
                    paymentStatus={b.paymentStatus}
                    pickupDate={b.pickupDate}
                  />
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">
                  {b.pickupLocation ?? "—"} → {b.dropLocation ?? "—"}
                </p>
                <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary">{formatINR(b.amount)}</p>
                <Link href={`/booking/${b.id}`} className="text-xs font-medium text-secondary hover:underline">
                  Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
