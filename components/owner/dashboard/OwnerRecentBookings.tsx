import Link from "next/link";
import type { OwnerDashboardBooking } from "@/lib/owner/dashboard-types";
import { OWNER_STATUS_STYLES, resolveBookingStatusKind } from "@/lib/owner/owner-status-styles";
import { formatDate, formatINR } from "@/lib/utils";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";
import { Route } from "lucide-react";

export default function OwnerRecentBookings({ bookings }: { bookings: OwnerDashboardBooking[] }) {
  return (
    <OwnerSection
      title="Recent Bookings"
      description="Last 10 booking activities"
      action={
        <Link href="/owner/bookings" className="text-sm font-semibold text-primary hover:underline">
          Full history →
        </Link>
      }
    >
      {bookings.length === 0 ? (
        <OwnerEmptyState
          icon={Route}
          title="No Bookings Yet"
          description="Your booking history will appear here once customers start renting your vehicles."
          actionLabel="View Bookings"
          actionHref="/owner/bookings"
        />
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {bookings.map((b) => {
            const kind = resolveBookingStatusKind(b.bookingStatus, b.paymentStatus);
            return (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50/50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-secondary">{b.bookingReference}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                      {kind}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {b.passengerName} · {b.bookingType}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
                </div>
                <p className="text-lg font-bold text-primary">{formatINR(b.amount)}</p>
              </div>
            );
          })}
        </div>
      )}
    </OwnerSection>
  );
}
