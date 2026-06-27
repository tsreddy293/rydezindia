import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import {
  deriveProtectionFields,
  selectBookingsList,
  BOOKING_ADMIN_LIST_COLUMN_SETS,
} from "@/lib/bookings/booking-select";
import { countsTowardRevenue } from "@/lib/bookings/revenue-eligibility";
import { formatDate, formatINR } from "@/lib/utils";
import { cancelBooking } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

const ADMIN_BOOKING_COLUMNS = [
  ...BOOKING_ADMIN_LIST_COLUMN_SETS,
  "id, booking_type, passenger_name, mobile, amount, booking_status, payment_status, refund_status, created_at, booking_reference, cancel_reason, cancelled_at, cancelled_by_role",
] as const;

export default async function AdminBookingsPage() {
  await requireRole("admin");
  const bookings = await selectBookingsList(ADMIN_BOOKING_COLUMNS, 100);

  const protectionRevenue = bookings.reduce((sum, b) => {
    if (!countsTowardRevenue(b)) return sum;
    const protection = deriveProtectionFields(b);
    if (!protection.protection_selected) return sum;
    return sum + Number(protection.protection_fee ?? 0);
  }, 0);

  const pendingCount = bookings.filter(
    (b) => String(b.booking_status ?? "").toLowerCase() === "pending"
  ).length;
  const cancelledCount = bookings.filter(
    (b) => String(b.booking_status ?? "").toLowerCase() === "cancelled"
  ).length;
  const activeCount = bookings.filter((b) => {
    const s = String(b.booking_status ?? "").toLowerCase();
    return s !== "cancelled" && s !== "completed";
  }).length;

  return (
    <AdminPageShell title="Booking Management" description="View, filter, cancel, and refund bookings">
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-amber-50 p-4">
          <p className="text-xs text-gray-500">Pending Bookings</p>
          <p className="text-xl font-bold text-amber-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border bg-red-50 p-4">
          <p className="text-xs text-gray-500">Cancelled</p>
          <p className="text-xl font-bold text-red-800">{cancelledCount}</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-4">
          <p className="text-xs text-gray-500">Active Bookings</p>
          <p className="text-xl font-bold text-blue-800">{activeCount}</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 p-4">
          <p className="text-xs text-gray-500">Protection Revenue</p>
          <p className="text-xl font-bold text-emerald-800">{formatINR(protectionRevenue)}</p>
        </div>
      </div>

      <AdminTable
        headers={[
          "Passenger",
          "Booking ID",
          "Type",
          "Amount",
          "Status",
          "Payment",
          "Cancelled",
          "Reason",
          "Actions",
        ]}
        rows={bookings.map((booking) => {
          const protection = deriveProtectionFields(booking);
          const protected_ = protection.protection_selected;
          const isCancelled = String(booking.booking_status ?? "").toLowerCase() === "cancelled";
          const ref = String(booking.booking_reference ?? booking.id ?? "").slice(0, 12);
          const cancelledByRole = String(booking.cancelled_by_role ?? "");
          const cancelledAt = booking.cancelled_at ? String(booking.cancelled_at) : "";

          return [
            `${String(booking.passenger_name ?? "Passenger")} ${booking.mobile ? `(${booking.mobile})` : ""}`,
            ref,
            String(booking.booking_type ?? "return_journey"),
            formatINR(Number(booking.amount ?? 0)),
            isCancelled ? (
              <span key="st" className="text-xs font-semibold text-red-700">
                Cancelled
              </span>
            ) : (
              String(booking.booking_status ?? "pending")
            ),
            String(booking.payment_status ?? "pending"),
            isCancelled ? (
              <span key="cb" className="text-xs text-gray-600">
                {cancelledByRole === "rider" ? "Cancelled By Rider" : cancelledByRole || "—"}
                {cancelledAt ? (
                  <span className="block text-[10px] text-gray-400">{formatDate(cancelledAt)}</span>
                ) : null}
              </span>
            ) : (
              "—"
            ),
            String(booking.cancellation_reason ?? "—"),
            !isCancelled ? (
              <form
                key="cancel"
                action={async () => {
                  "use server";
                  await cancelBooking({
                    bookingId: String(booking.id),
                    reason: "Cancelled by admin",
                    cancelledBy: "admin",
                  });
                }}
              >
                <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                  Cancel
                </button>
              </form>
            ) : (
              "—"
            ),
          ];
        })}
      />
    </AdminPageShell>
  );
}
