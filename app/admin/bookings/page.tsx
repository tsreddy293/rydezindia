import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import { getAdminRows } from "@/lib/supabase/queries";
import { formatINR } from "@/lib/utils";
import { cancelBooking } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireRole("admin");
  const bookings = await getAdminRows(
    "bookings",
    "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, protection_selected, flexible_cancellation, protection_fee, flexible_cancellation_fee, protection_status, protection_plan_name, created_at",
    100
  );

  const protectionRevenue = bookings.reduce((sum, b) => {
    const selected = b.protection_selected === true || b.flexible_cancellation === true;
    if (!selected) return sum;
    return sum + Number(b.protection_fee ?? b.flexible_cancellation_fee ?? 0);
  }, 0);

  return (
    <AdminPageShell title="Booking Management" description="View, filter, cancel, and refund bookings">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-emerald-50 p-4">
          <p className="text-xs text-gray-500">Protection Revenue (shown)</p>
          <p className="text-xl font-bold text-emerald-800">{formatINR(protectionRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Protected Bookings</p>
          <p className="text-xl font-bold">
            {bookings.filter((b) => b.protection_selected || b.flexible_cancellation).length}
          </p>
        </div>
      </div>

      <AdminTable
        headers={["Passenger", "Type", "Amount", "Protection", "Fee", "Booking", "Payment", "Actions"]}
        rows={bookings.map((booking) => {
          const protected_ =
            booking.protection_selected === true || booking.flexible_cancellation === true;
          const fee = Number(booking.protection_fee ?? booking.flexible_cancellation_fee ?? 0);

          return [
            `${String(booking.passenger_name ?? "Passenger")} ${booking.mobile ? `(${booking.mobile})` : ""}`,
            String(booking.booking_type ?? "return_journey"),
            formatINR(Number(booking.amount ?? 0)),
            protected_ ? (
              <span key="prot" className="text-xs font-semibold uppercase text-emerald-700">
                {(booking.protection_status as string) ?? "ACTIVE"}
              </span>
            ) : (
              "—"
            ),
            protected_ ? formatINR(fee) : "—",
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
          ];
        })}
      />
    </AdminPageShell>
  );
}
