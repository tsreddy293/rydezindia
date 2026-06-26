import { redirect } from "next/navigation";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import OwnerActionCenter from "@/components/owner/dashboard/OwnerActionCenter";
import OwnerActivityTimeline from "@/components/owner/dashboard/OwnerActivityTimeline";
import OwnerDashboardWidgets from "@/components/owner/dashboard/OwnerDashboardWidgets";
import OwnerDocumentReminders from "@/components/owner/dashboard/OwnerDocumentReminders";
import OwnerEarningsSection, { OwnerReportsSection } from "@/components/owner/dashboard/OwnerEarningsSection";
import OwnerNotificationsPreview from "@/components/owner/dashboard/OwnerNotificationsPreview";
import OwnerPerformanceSection from "@/components/owner/dashboard/OwnerPerformanceSection";
import OwnerQuickActions from "@/components/owner/dashboard/OwnerQuickActions";
import OwnerRecentBookings from "@/components/owner/dashboard/OwnerRecentBookings";
import OwnerStatsGrid from "@/components/owner/dashboard/OwnerStatsGrid";
import OwnerSupportCard from "@/components/owner/dashboard/OwnerSupportCard";
import OwnerUpcomingBookingsTable from "@/components/owner/dashboard/OwnerUpcomingBookingsTable";
import OwnerVehicleCards from "@/components/owner/dashboard/OwnerVehicleCards";
import { getOwnerDashboardData } from "@/lib/owner/dashboard-data";
import { requireRole } from "@/server/actions/auth";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    passwordError?: string;
    passwordSuccess?: string;
    "action-center"?: string;
    section?: string;
  }>;
}

function formatMemberSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function OwnerDashboardPage({ searchParams }: Props) {
  const { user } = await requireRole("owner");
  const params = await searchParams;
  const { passwordError, passwordSuccess } = params;

  if ("action-center" in params || params.section === "action-center") {
    redirect("/owner/action-center");
  }

  const data = await getOwnerDashboardData(user);

  const isVerified = data.verificationLabel.includes("Verified");

  return (
    <div className="space-y-8">
      {/* Hero welcome strip — mobile shows header details sidebar lacks */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-primary/5 p-6 shadow-sm lg:hidden dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-primary/10">
        <p className="text-sm font-medium text-primary">Welcome Owner</p>
        <h1 className="text-2xl font-bold text-secondary dark:text-white">{data.displayName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isVerified ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
            {data.verificationLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            {data.averageRating.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500">Since {formatMemberSince(data.memberSince)}</span>
        </div>
      </div>

      <OwnerActionCenter items={data.actionCenter} />

      <OwnerDashboardWidgets data={data} />

      <OwnerDocumentReminders reminders={data.documentReminders} />

      <OwnerQuickActions />

      <OwnerStatsGrid stats={data.stats} />

      <OwnerUpcomingBookingsTable bookings={data.upcomingBookings} />

      <OwnerRecentBookings bookings={data.recentBookings} />

      <OwnerVehicleCards vehicles={data.vehicles} />

      <OwnerEarningsSection earnings={data.earnings} walletBalance={data.walletBalance} />

      <OwnerReportsSection reports={data.reports} />

      <OwnerPerformanceSection performance={data.performance} revenueGoal={data.revenueGoal} />

      <div className="grid gap-6 lg:grid-cols-2">
        <OwnerNotificationsPreview
          notifications={data.notifications}
          unreadCount={data.unreadNotificationCount}
        />
        <OwnerSupportCard />
      </div>

      <OwnerActivityTimeline items={data.activity} />

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <ChangePasswordForm returnTo="/owner/dashboard" error={passwordError} success={passwordSuccess} />
      </section>
    </div>
  );
}
