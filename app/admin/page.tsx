import {
  BarChart3,
  CalendarCheck,
  Car,
  CarFront,
  CheckCircle,
  Clock,
  IndianRupee,
  Route,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { testSupabaseConnection } from "@/lib/supabase/admin";
import { getPlatformStats } from "@/lib/supabase/queries";
import { getAuthStats } from "@/lib/services/auth-admin";
import { formatDate, formatINR } from "@/lib/utils";
import { requireRole, signOutUser } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

function ChartBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-sm text-gray-500">No chart data yet.</p>
      ) : (
        data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-gray-500">
              <span>{item.label}</span>
              <span>{item.value.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default async function AdminPage() {
  await requireRole("admin");
  const connection = await testSupabaseConnection();
  const stats = connection.ok ? await getPlatformStats() : await getPlatformStats();
  const authStats = await getAuthStats();

  const cards = [
    { icon: Shield, label: "Total Owners", value: stats.vehicleOwners.toLocaleString("en-IN") },
    { icon: Users, label: "Total Users", value: stats.users.toLocaleString("en-IN") },
    { icon: Car, label: "Total Vehicles", value: stats.vehicles.toLocaleString("en-IN") },
    { icon: CheckCircle, label: "Approved Vehicles", value: stats.approvedVehicles.toLocaleString("en-IN") },
    { icon: Clock, label: "Pending Vehicles", value: stats.pendingVehicles.toLocaleString("en-IN") },
    { icon: Shield, label: "Pending Approvals", value: stats.pendingApprovals.toLocaleString("en-IN") },
    { icon: Route, label: "Return Journey Vehicles", value: stats.returnJourneys.toLocaleString("en-IN") },
    { icon: CarFront, label: "Self Drive Vehicles", value: stats.selfDriveVehicles.toLocaleString("en-IN") },
    { icon: Car, label: "Driver Vehicles", value: stats.driverVehicles.toLocaleString("en-IN") },
    { icon: CalendarCheck, label: "Total Bookings", value: stats.bookings.toLocaleString("en-IN") },
    { icon: CalendarCheck, label: "Today's Bookings", value: stats.todaysBookings.toLocaleString("en-IN") },
    { icon: IndianRupee, label: "Return Journey Revenue", value: formatINR(stats.returnJourneyRevenue) },
    { icon: IndianRupee, label: "Driver Vehicle Revenue", value: formatINR(stats.driverVehicleRevenue) },
    { icon: IndianRupee, label: "Self Drive Revenue", value: formatINR(stats.selfDriveRevenue) },
    { icon: IndianRupee, label: "Monthly Revenue", value: formatINR(stats.monthlyRevenue) },
    { icon: IndianRupee, label: "Total Revenue", value: formatINR(stats.revenue) },
    { icon: Shield, label: "Verified Users", value: authStats.verified.toLocaleString("en-IN") },
    { icon: Shield, label: "Unverified Users", value: authStats.unverified.toLocaleString("en-IN") },
    { icon: Shield, label: "Blocked Accounts", value: authStats.blocked.toLocaleString("en-IN") },
  ];

  const modules = [
    { href: "/admin/users", label: "User Management" },
    { href: "/admin/owners", label: "Owner Management" },
    { href: "/admin/vehicles", label: "Vehicle Management" },
    { href: "/admin/bookings", label: "Booking Management" },
    { href: "/admin/payments", label: "Payment Management" },
    { href: "/admin/kyc", label: "Owner KYC" },
    { href: "/admin/customer-kyc", label: "Customer KYC" },
    { href: "/admin/documents", label: "Documents" },
    { href: "/admin/coupons", label: "Coupons" },
    { href: "/admin/notifications", label: "Notifications" },
    { href: "/admin/reports", label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-secondary text-white px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Rydez India Admin</h1>
            <p className="text-white/60 text-sm mt-0.5">
              {connection.ok ? "Marketplace dashboard" : "Connection error"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
              Back to Site
            </Link>
            <form action={signOutUser}>
              <button type="submit" className="text-sm text-white/70 hover:text-white transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {!connection.ok && (
          <div className="mb-8">
            <SupabaseErrorBanner message={connection.message} />
          </div>
        )}

        {connection.ok && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {connection.message}
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-medium text-secondary hover:bg-primary hover:text-white transition-colors"
            >
              {module.label}
            </Link>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-8">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <p className="text-2xl font-bold text-secondary">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Revenue Trend
            </h2>
            <ChartBars data={stats.revenueTrend ?? []} />
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Booking Trend
            </h2>
            <ChartBars data={stats.bookingTrend ?? []} />
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Vehicle Category Distribution
            </h2>
            <ChartBars data={stats.vehicleCategoryDistribution ?? []} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4">Recent Bookings</h2>
            <div className="space-y-3">
              {(stats.recentBookings ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No bookings yet.</p>
              ) : (
                stats.recentBookings?.map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-secondary">{booking.booking_type}</span>
                      <span className="font-semibold text-primary">{formatINR(booking.amount)}</span>
                    </div>
                    <p className="mt-1 text-gray-500">{booking.booking_status} - {formatDate(booking.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4">Recent Vehicle Registrations</h2>
            <div className="space-y-3">
              {(stats.recentVehicles ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No vehicles yet.</p>
              ) : (
                stats.recentVehicles?.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-secondary">{vehicle.vehicle_name}</p>
                    <p className="mt-1 text-gray-500">
                      {vehicle.vehicle_type} - {vehicle.vehicle_number || "No number"} - {vehicle.status}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(vehicle.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4">Recent Owner Registrations</h2>
            <div className="space-y-3">
              {(stats.recentOwners ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">No owners yet.</p>
              ) : (
                stats.recentOwners?.map((owner) => (
                  <div key={owner.id} className="rounded-xl bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-secondary">{owner.owner_name}</p>
                    <p className="mt-1 text-gray-500">
                      {owner.mobile} - {owner.verification_status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
