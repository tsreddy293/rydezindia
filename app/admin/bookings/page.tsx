import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { formatINR } from "@/lib/utils";
import { cancelBooking } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireRole("admin");
  const bookings = await getAdminRows("bookings", "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, created_at", 100);

  return (
    <AdminPageShell title="Booking Management" description="View, filter, cancel, and refund bookings">
      <AdminTable
        headers={["Passenger", "Type", "Amount", "Booking", "Payment", "Actions"]}
        rows={bookings.map((booking) => [
          `${String(booking.passenger_name ?? "Passenger")} ${booking.mobile ? `(${booking.mobile})` : ""}`,
          String(booking.booking_type ?? "return_journey"),
          formatINR(Number(booking.amount ?? 0)),
          String(booking.booking_status ?? "pending"),
          String(booking.payment_status ?? "pending"),
          <form key="cancel" action={async () => {
            "use server";
            await cancelBooking({ bookingId: String(booking.id), reason: "Cancelled by admin", cancelledBy: "admin" });
          }}>
            <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
              Cancel
            </button>
          </form>,
        ])}
      />
    </AdminPageShell>
  );
}
