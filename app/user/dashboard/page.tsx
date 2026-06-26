import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import BookingTimelineSection from "@/components/rider/dashboard/BookingTimelineSection";
import KycStatusCard from "@/components/rider/dashboard/KycStatusCard";
import QuickActions from "@/components/rider/dashboard/QuickActions";
import RecentBookingsSection from "@/components/rider/dashboard/RecentBookingsSection";
import ReferralProgramCard from "@/components/rider/dashboard/ReferralProgramCard";
import RewardPointsCard from "@/components/rider/dashboard/RewardPointsCard";
import RiderActionCenter from "@/components/rider/dashboard/RiderActionCenter";
import RiderReminders from "@/components/rider/dashboard/RiderReminders";
import RiderStatsGrid from "@/components/rider/dashboard/RiderStatsGrid";
import RiderWelcomeSection from "@/components/rider/dashboard/RiderWelcomeSection";
import SavedVehiclesSection from "@/components/rider/dashboard/SavedVehiclesSection";
import SupportCenterCard from "@/components/rider/dashboard/SupportCenterCard";
import UpcomingTripCard from "@/components/rider/dashboard/UpcomingTripCard";
import WalletSummary from "@/components/rider/dashboard/WalletSummary";
import { getRiderDashboardData } from "@/lib/rider/dashboard-data";
import { requireRiderDashboard } from "@/lib/auth/customer-auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ passwordError?: string; passwordSuccess?: string }>;
}

export default async function UserDashboardPage({ searchParams }: Props) {
  const { user } = await requireRiderDashboard("/dashboard");
  const { passwordError, passwordSuccess } = await searchParams;
  const data = await getRiderDashboardData(user);

  return (
    <div className="space-y-8">
      <RiderWelcomeSection
        displayName={data.displayName}
        memberSince={data.memberSince}
        verificationLabel={data.verificationLabel}
        averageRating={data.averageRating}
      />

      <RiderReminders items={data.reminders} />

      <RiderActionCenter items={data.actionCenter} />

      <UpcomingTripCard trip={data.upcomingTrip} />

      <QuickActions />

      <RiderStatsGrid stats={data.stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <WalletSummary wallet={data.wallet} />
        <RewardPointsCard loyalty={data.loyalty} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SavedVehiclesSection vehicles={data.savedVehicles} />
        <RecentBookingsSection bookings={data.recentBookings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <KycStatusCard status={data.kycStatus} showKycSection={data.showKycSection} />
        <BookingTimelineSection booking={data.timelineBooking} />
      </div>

      <ReferralProgramCard referrals={data.referrals} />

      <SupportCenterCard />

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ChangePasswordForm returnTo="/dashboard" error={passwordError} success={passwordSuccess} />
      </section>
    </div>
  );
}
