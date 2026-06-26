import nextDynamic from "next/dynamic";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  filterActionableOwnerEarnings,
  isUnsettledOwnerEarning,
} from "@/lib/owner/booking-eligibility";
import { mapOwnerBooking } from "@/lib/owner/booking-utils";
import { getOwnerBookings, getOwnerEarnings } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerWalletHub = nextDynamic(() => import("@/components/owner/wallet/OwnerWalletHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Wallet",
  description: "Your Rydez India host wallet.",
  path: "/owner/wallet",
  noIndex: true,
});

export default async function OwnerWalletPage() {
  const { user } = await requireRole("owner");
  const [earningsRaw, bookingsRaw, profileRes] = await Promise.all([
    getOwnerEarnings(user.id),
    getOwnerBookings(user.id),
    createAdminClient().from("owner_profiles").select("bank_account, ifsc_code").eq("user_id", user.id).maybeSingle(),
  ]);

  const bookings = bookingsRaw.map(mapOwnerBooking);
  const rows = filterActionableOwnerEarnings(
    earningsRaw as Array<Record<string, unknown>>,
    bookings
  );
  const lifetime = rows.reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const pending = rows
    .filter((r) => isUnsettledOwnerEarning(r))
    .reduce((s, r) => s + Number(r.net_amount ?? 0), 0);

  const settled = rows.filter((r) => String(r.status ?? "").toLowerCase() === "settled");
  const lastSettlement = settled[0]
    ? String(settled[0].earned_at ?? settled[0].created_at)
    : undefined;

  const withdrawHistory = settled.slice(0, 10).map((r) => ({
    id: String(r.id),
    date: String(r.earned_at ?? r.created_at),
    amount: Number(r.net_amount ?? 0),
    status: "settled",
  }));

  const profile = profileRes.data as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">Balance, bank details & withdrawals</p>
      </div>
      <OwnerWalletHub
        currentBalance={lifetime - pending}
        pendingBalance={pending}
        withdrawable={lifetime - pending}
        lastSettlement={lastSettlement}
        bankAccount={profile ? String(profile.bank_account ?? "") : undefined}
        ifsc={profile ? String(profile.ifsc_code ?? "") : undefined}
        withdrawHistory={withdrawHistory}
      />
    </div>
  );
}
