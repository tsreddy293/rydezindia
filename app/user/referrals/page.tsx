import ReferralDashboardClient from "@/components/referrals/ReferralDashboardClient";
import { fetchReferralStats } from "@/server/actions/phase2";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Referrals",
  description: "Refer friends and earn wallet credits on Rydez India.",
  path: "/dashboard/referrals",
  noIndex: true,
});

export default async function ReferralsPage() {
  await requireRole("user");
  const stats = await fetchReferralStats();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Refer & Earn</h1>
        <p className="mt-1 text-sm text-gray-500">Invite friends and earn wallet credits</p>
      </div>
      <ReferralDashboardClient stats={stats} />
    </div>
  );
}
