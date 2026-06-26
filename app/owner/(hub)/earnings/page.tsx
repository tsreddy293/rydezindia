import nextDynamic from "next/dynamic";
import {
  filterActionableOwnerEarnings,
  isUnsettledOwnerEarning,
} from "@/lib/owner/booking-eligibility";
import { mapOwnerBooking } from "@/lib/owner/booking-utils";
import { getOwnerEarnings, getOwnerBookings, getOwnerStats } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerEarningsHub = nextDynamic(() => import("@/components/owner/earnings/OwnerEarningsHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Earnings",
  description: "Track your earnings on Rydez India.",
  path: "/owner/earnings",
  noIndex: true,
});

export default async function OwnerEarningsPage() {
  const { user } = await requireRole("owner");
  const [earningsRaw, stats, bookingsRaw] = await Promise.all([
    getOwnerEarnings(user.id),
    getOwnerStats(user.id),
    getOwnerBookings(user.id),
  ]);

  const bookings = bookingsRaw.map(mapOwnerBooking);
  const rows = filterActionableOwnerEarnings(
    earningsRaw as Array<Record<string, unknown>>,
    bookings
  );
  const sum = (filter?: (r: Record<string, unknown>) => boolean) =>
    rows.filter(filter ?? (() => true)).reduce((s, r) => s + Number(r.net_amount ?? 0), 0);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const today = sum((r) => new Date(String(r.earned_at ?? r.created_at)) >= todayStart);
  const month = sum((r) => new Date(String(r.earned_at ?? r.created_at)) >= monthStart);
  const week = sum((r) => new Date(String(r.earned_at ?? r.created_at)) >= weekStart);
  const year = sum((r) => new Date(String(r.earned_at ?? r.created_at)) >= yearStart);
  const lifetime = sum();
  const pending = sum((r) => isUnsettledOwnerEarning(r));
  const commission = rows.reduce((s, r) => s + Number(r.platform_fee ?? 0), 0);

  const earnings = rows.map((r) => ({
    id: String(r.id),
    earnedAt: String(r.earned_at ?? r.created_at),
    gross: Number(r.gross_amount ?? 0),
    platformFee: Number(r.platform_fee ?? 0),
    net: Number(r.net_amount ?? 0),
    status: String(r.status ?? "pending"),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-gray-500">Revenue analytics and settlement tracking</p>
      </div>
      <OwnerEarningsHub
        today={today}
        week={week}
        month={month}
        year={year}
        lifetime={lifetime}
        pending={pending}
        withdrawable={lifetime - pending}
        commission={commission}
        earnings={earnings}
        revenueTrend={stats.revenueTrend ?? []}
      />
    </div>
  );
}
