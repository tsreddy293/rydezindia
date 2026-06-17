import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import Button from "@/components/ui/Button";
import { getUserBookings } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Bookings",
  description: "View your vehicle booking history on Rydez India.",
  path: "/user/bookings",
  noIndex: true,
});

export default async function UserBookingsPage() {
  const { user } = await requireRole("user");
  const bookings = await getUserBookings(user.id);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">My Bookings</h1>
        {bookings.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-50">
            <p className="text-gray-500 mb-4">No bookings yet.</p>
            <Button href="/search" variant="primary">Search Vehicles</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border bg-white p-5 shadow-sm flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.booking_reference ?? b.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">{b.booking_type} · {formatDate(b.created_at)}</p>
                  {b.pickup_location && <p className="text-sm mt-1">{b.pickup_location} → {b.drop_location}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatINR(b.amount)}</p>
                  <p className="text-xs text-gray-500">{b.booking_status}</p>
                  <Button href={`/booking/confirmation/${b.id}`} variant="outline" size="sm" className="mt-2">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
