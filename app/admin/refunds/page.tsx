import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminRefundsClient from "@/components/admin/AdminRefundsClient";
import { getCancelledBookings, getRefundAnalytics } from "@/lib/services/booking-cancellation";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  await requireRole("admin");
  const [bookings, analytics] = await Promise.all([getCancelledBookings(100), getRefundAnalytics()]);

  return (
    <AdminPageShell
      title="Refunds & Cancellations"
      description="Review cancelled bookings, approve refunds, and view refund analytics"
    >
      <AdminRefundsClient bookings={bookings} analytics={analytics} />
    </AdminPageShell>
  );
}
