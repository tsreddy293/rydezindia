import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import ReferralDashboardClient from "@/components/referrals/ReferralDashboardClient";
import { fetchReferralStats } from "@/server/actions/phase2";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Referrals",
  description: "Refer friends and earn wallet credits on Rydez India.",
  path: "/user/referrals",
  noIndex: true,
});

export default async function ReferralsPage() {
  await requireRole("user");
  const stats = await fetchReferralStats();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Refer & Earn</h1>
        <ReferralDashboardClient stats={stats} />
      </div>
    </PageLayout>
  );
}
