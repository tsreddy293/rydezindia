import { Calendar, Car, DollarSign, Route } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import Button from "@/components/ui/Button";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { getOwnerDashboardMetrics, getOwnerStats } from "@/lib/supabase/queries";
import { listNotifications } from "@/lib/services/notifications";
import { formatINR } from "@/lib/utils";
import { requireRole, signOutUser } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ passwordError?: string; passwordSuccess?: string }>;
}

export default async function OwnerDashboardPage({ searchParams }: Props) {
  const { user } = await requireRole("owner");
  const { passwordError, passwordSuccess } = await searchParams;
  const [metrics, stats] = await Promise.all([
    getOwnerDashboardMetrics(user.id),
    getOwnerStats(user.id),
  ]);
  const notifications = await listNotifications({ recipientId: user.id, recipientRole: "owner", limit: 10 });
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);

  const cards = [
    { icon: Car, label: "Total Vehicles", value: metrics.totalVehicles },
    { icon: Route, label: "Active Bookings", value: metrics.activeBookings },
    { icon: Calendar, label: "Upcoming Trips", value: metrics.upcomingTrips },
    { icon: DollarSign, label: "Earnings Today", value: formatINR(metrics.earningsToday) },
    { icon: DollarSign, label: "Earnings This Month", value: formatINR(metrics.earningsThisMonth) },
  ];

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Owner Dashboard</h1>
            <p className="text-gray-600">Manage vehicles, bookings, and earnings</p>
            <p className={`mt-2 text-sm ${emailVerified ? "text-green-600" : "text-yellow-600"}`}>
              {emailVerified ? "Email verified" : "Email verification pending"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/owner/my-vehicles" variant="outline" size="sm">My Vehicles</Button>
            <Button href="/owner/add-vehicle" variant="primary" size="sm">Add Vehicle</Button>
            <Button href="/return-journeys" variant="outline" size="sm">Return Journeys</Button>
            <form action={signOutUser}>
              <button type="submit" className="inline-flex items-center justify-center rounded-xl border-2 border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white">
                Logout
              </button>
            </form>
          </div>
        </div>

        <OwnerDashboardNav />

        {metrics.totalVehicles === 0 && (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
            <h2 className="text-lg font-bold text-secondary mb-2">Start Vehicle Onboarding</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-2xl">
              Add your vehicle, upload photos and documents (RC, Insurance, Pollution), then submit for admin approval.
              Once approved, your vehicle becomes searchable for riders across India.
            </p>
            <Button href="/owner/add-vehicle" variant="primary">Add Your First Vehicle</Button>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <Icon className="h-8 w-8 text-primary mb-3" />
              <p className="text-2xl font-bold text-secondary">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
              </p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-secondary">Recent Vehicles</h2>
            {(stats.recentVehicles ?? []).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No vehicles yet</p>
            ) : (
              <div className="space-y-4">
                {stats.recentVehicles?.slice(0, 5).map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl bg-gray-50 p-4 flex justify-between">
                    <div>
                      <p className="font-medium text-secondary">{vehicle.vehicle_name}</p>
                      <p className="text-sm text-gray-500">{vehicle.vehicle_type}</p>
                    </div>
                    <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary h-fit">{vehicle.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-secondary">Recent Bookings</h2>
            {(stats.recentBookings ?? []).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {stats.recentBookings?.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-gray-50 p-4 flex justify-between">
                    <p className="font-medium text-secondary">{booking.booking_type}</p>
                    <span className="font-semibold text-primary">{formatINR(booking.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8">
          <NotificationCenter notifications={notifications as Record<string, unknown>[]} />
        </div>
        <div className="mt-8">
          <ChangePasswordForm returnTo="/owner/dashboard" error={passwordError} success={passwordSuccess} />
        </div>
      </div>
    </PageLayout>
  );
}
