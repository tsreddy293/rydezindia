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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Welcome back</p>
          <h1 className="text-2xl font-bold text-secondary md:text-3xl">{data.displayName}</h1>
          <p className="mt-1 text-sm text-gray-500">Your rides, wallet, and rewards in one place</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            data.emailVerified ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
          }`}
        >
          {data.emailVerified ? "Email verified" : "Verify your email"}
        </span>
      </div>

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
