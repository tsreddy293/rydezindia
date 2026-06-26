import nextDynamic from "next/dynamic";
import { mapOwnerBooking } from "@/lib/owner/booking-utils";
import { getOwnerBookings, getOwnerEarnings } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerPaymentsHub = nextDynamic(() => import("@/components/owner/payments/OwnerPaymentsHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Payments",
  description: "View payment history and settlements on Rydez India.",
  path: "/owner/payments",
  noIndex: true,
});

export default async function OwnerPaymentsPage() {
  const { user } = await requireRole("owner");
  const [bookingsRaw, earningsRaw] = await Promise.all([
    getOwnerBookings(user.id),
    getOwnerEarnings(user.id),
  ]);

  const bookings = bookingsRaw.map(mapOwnerBooking);
  const earnings = (earningsRaw as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    gross: Number(r.gross_amount ?? 0),
    platformFee: Number(r.platform_fee ?? 0),
    net: Number(r.net_amount ?? 0),
    status: String(r.status ?? ""),
    date: String(r.earned_at ?? r.created_at),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">Payments, refunds, settlements & invoices</p>
      </div>
      <OwnerPaymentsHub bookings={bookings} earnings={earnings} />
    </div>
  );
}
