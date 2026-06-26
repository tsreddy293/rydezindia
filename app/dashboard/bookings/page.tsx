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
    <div className="space-y-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <CalendarDays className="h-3.5 w-3.5" />
          Bookings
        </div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">My Bookings</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-500">
          View trip details, download invoices, reschedule rides, cancel bookings, and track refunds.
        </p>
      </div>
      <MyBookingsClient bookings={bookings} />
    </div>
  );
}
