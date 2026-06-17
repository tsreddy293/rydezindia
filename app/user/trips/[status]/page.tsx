import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import Button from "@/components/ui/Button";
import { getUserBookings } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ status: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { status } = await params;
  return createPageMetadata({
    title: status === "completed" ? "Completed Trips" : "Active Trips",
    description: "View your active and completed trips on Rydez India.",
    path: `/user/trips/${status}`,
    noIndex: true,
  });
}

export default async function UserTripsPage({ params }: Props) {
  const { status } = await params;
  const isCompleted = status === "completed";
  const { user } = await requireRole("user");
  const allBookings = await getUserBookings(user.id);
  const bookings = allBookings.filter((b) =>
    isCompleted ? b.booking_status === "completed" : ["confirmed", "pending"].includes(b.booking_status)
  );

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">
          {isCompleted ? "Completed Trips" : "Active Trips"}
        </h1>
        {bookings.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-50 text-gray-500">
            No {isCompleted ? "completed" : "active"} trips.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex justify-between">
                  <p className="font-semibold">{b.booking_reference ?? b.id.slice(0, 8)}</p>
                  <p className="font-bold text-primary">{formatINR(b.amount)}</p>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {b.pickup_location} → {b.drop_location}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {b.pickup_date ? formatDate(b.pickup_date) : formatDate(b.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
        {!isCompleted && (
          <div className="mt-6 text-center">
            <Button href="/search" variant="primary">Book a Trip</Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
