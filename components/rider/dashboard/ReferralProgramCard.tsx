import ReferralDashboardClient from "@/components/referrals/ReferralDashboardClient";
import type { RiderDashboardData } from "@/lib/rider/dashboard-types";

export default function ReferralProgramCard({
  referrals,
}: {
  referrals: RiderDashboardData["referrals"];
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">Referral Program</h2>
      <ReferralDashboardClient
        stats={{
          referralCode: referrals.code,
          totalReferrals: referrals.totalReferrals,
          successfulReferrals: referrals.successfulReferrals,
          earnings: referrals.earnings,
        }}
      />
    </section>
  );
}
