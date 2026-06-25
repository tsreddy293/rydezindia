import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import MyBookingsClient from "@/components/dashboard/my-bookings/MyBookingsClient";
import { requireRiderDashboard } from "@/lib/auth/customer-auth";
import { getMyBookingsForUser } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Bookings",
  description: "Manage your Rydez India bookings, invoices, reschedules, and refunds.",
  path: "/dashboard/bookings",
  noIndex: true,
});

export default async function RiderBookingsPage() {
  const { user } = await requireRiderDashboard("/dashboard/bookings");
  const bookings = await getMyBookingsForUser(user.id);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <UserDashboardNav />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <CalendarDays className="h-3.5 w-3.5" />
              Bookings Dashboard
            </div>
            <h1 className="text-3xl font-bold text-secondary md:text-4xl">My Bookings</h1>
            <p className="mt-2 text-gray-500 max-w-xl">
              View trip details, download invoices, reschedule rides, cancel bookings, and track refunds — all in one place.
            </p>
          </div>
        </div>

        <MyBookingsClient bookings={bookings} />
      </div>
    </PageLayout>
  );
}
