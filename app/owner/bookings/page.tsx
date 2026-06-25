import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import { getOwnerBookings } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Bookings",
  description: "View booking requests for your vehicles.",
  path: "/owner/bookings",
  noIndex: true,
});

export default async function OwnerBookingsPage() {
  const { user } = await requireRole("owner");
  const bookings = await getOwnerBookings(user.id);
  const visibleBookings = bookings.filter(
    (b) => b.booking_status.toLowerCase() !== "cancelled"
  );

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">My Bookings</h1>

        {visibleBookings.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-16 text-center text-gray-500">No active bookings.</div>
        ) : (
          <div className="space-y-4">
            {visibleBookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-secondary">
                      {booking.booking_reference ?? booking.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-500">{booking.passenger_name} · {booking.booking_type}</p>
                    {booking.pickup_location && (
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.pickup_location} → {booking.drop_location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatINR(booking.amount)}</p>
                    <p className="text-xs text-gray-500">{booking.booking_status} · {booking.payment_status}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{formatDate(booking.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
