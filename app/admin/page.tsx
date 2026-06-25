import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import ActionCenter from "@/components/admin/dashboard/ActionCenter";
import DashboardBookingsWithFilters from "@/components/admin/dashboard/DashboardBookingsWithFilters";
import FinanceSection from "@/components/admin/dashboard/FinanceSection";
import MarketplaceSummary from "@/components/admin/dashboard/MarketplaceSummary";
import PendingApprovalQueue from "@/components/admin/dashboard/PendingApprovalQueue";
import RecentActivity from "@/components/admin/dashboard/RecentActivity";
import ReminderCards from "@/components/admin/dashboard/ReminderCards";
import ReportsSection from "@/components/admin/dashboard/ReportsSection";
import UserManagementSection from "@/components/admin/dashboard/UserManagementSection";
import VehicleManagementSection from "@/components/admin/dashboard/VehicleManagementSection";
import { getAdminDashboardData } from "@/lib/admin/dashboard-data";
import { testSupabaseConnection } from "@/lib/supabase/admin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole("admin");
  const connection = await testSupabaseConnection();
  const dashboard = await getAdminDashboardData();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-secondary">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Task-oriented marketplace administration
        </p>
      </div>

      {!connection.ok && (
        <SupabaseErrorBanner message={connection.message} />
      )}

      {connection.ok && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {connection.message}
        </div>
      )}

      <ActionCenter items={dashboard.actionCenter} />

      <ReminderCards items={dashboard.reminders} />

      <MarketplaceSummary summary={dashboard.summary} />

      <RecentActivity items={dashboard.activity} />

      <PendingApprovalQueue items={dashboard.pendingApprovals} />

      <DashboardBookingsWithFilters bookings={dashboard.bookings} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UserManagementSection data={dashboard.userManagement} />
        <VehicleManagementSection data={dashboard.vehicleManagement} />
      </div>

      <FinanceSection finance={dashboard.finance} />

      <ReportsSection reports={dashboard.reports} />

      <section id="settings" className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-secondary">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Admin configuration and module shortcuts
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Coupons", href: "/admin/coupons" },
            { label: "Notifications", href: "/admin/notifications" },
            { label: "Payments", href: "/admin/payments" },
            { label: "Protection Plans", href: "/admin/protection" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-secondary hover:bg-white hover:shadow-sm"
            >
              {item.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
