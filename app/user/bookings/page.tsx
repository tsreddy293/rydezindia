import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import UserBookingsClient from "@/components/dashboard/UserBookingsClient";
import { getUserBookingsExtended } from "@/lib/supabase/queries";
import { getUserRefundHistory } from "@/lib/services/booking-cancellation";
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
  const [bookings, refundHistory] = await Promise.all([
    getUserBookingsExtended(user.id),
    getUserRefundHistory(user.id),
  ]);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-2">My Bookings</h1>
        <p className="text-gray-500 mb-8">Manage bookings, cancel trips, and track refunds</p>
        <UserBookingsClient bookings={bookings} refundHistory={refundHistory} />
      </div>
    </PageLayout>
  );
}
