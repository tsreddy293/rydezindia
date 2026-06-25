import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import {
  deriveProtectionFields,
  selectBookingsList,
  BOOKING_ADMIN_LIST_COLUMN_SETS,
} from "@/lib/bookings/booking-select";
import { formatINR } from "@/lib/utils";
import { cancelBooking } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  await requireRole("admin");
  const bookings = await selectBookingsList(BOOKING_ADMIN_LIST_COLUMN_SETS, 100);

  const protectionRevenue = bookings.reduce((sum, b) => {
    const protection = deriveProtectionFields(b);
    if (!protection.protection_selected) return sum;
    return sum + Number(protection.protection_fee ?? 0);
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
            {bookings.filter((b) => deriveProtectionFields(b).protection_selected).length}
          </p>
        </div>
      </div>

      <AdminTable
        headers={["Passenger", "Type", "Amount", "Protection", "Fee", "Booking", "Payment", "Actions"]}
        rows={bookings.map((booking) => {
          const protection = deriveProtectionFields(booking);
          const protected_ = protection.protection_selected;
          const fee = Number(protection.protection_fee ?? 0);

          return [
            `${String(booking.passenger_name ?? "Passenger")} ${booking.mobile ? `(${booking.mobile})` : ""}`,
            String(booking.booking_type ?? "return_journey"),
            formatINR(Number(booking.amount ?? 0)),
            protected_ ? (
              <span key="prot" className="text-xs font-semibold uppercase text-emerald-700">
                {protection.protection_status ?? "ACTIVE"}
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
