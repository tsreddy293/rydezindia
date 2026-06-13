import { Calendar, Car, DollarSign, Route, Users } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { getOwnerStats } from "@/lib/supabase/queries";
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
  const stats = await getOwnerStats(user.id);
  const notifications = await listNotifications({ recipientId: user.id, recipientRole: "owner", limit: 10 });
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);

  const menu = [
    { href: "/vehicles/add", label: "My Return Journeys" },
    { href: "/vehicles/driver", label: "My Driver Vehicles" },
    { href: "/vehicles/self-drive", label: "My Self Drive Vehicles" },
    { href: "/owner/kyc", label: "KYC" },
    { href: "/owner/dashboard#bookings", label: "Bookings" },
    { href: "/owner/dashboard#revenue-summary", label: "Revenue" },
  ];

  const cards = [
    { icon: Route, label: "My Return Journeys", value: stats.returnJourneys },
    { icon: Users, label: "My Driver Vehicles", value: stats.driverVehicles },
    { icon: Car, label: "My Self Drive Vehicles", value: stats.selfDriveVehicles },
    { icon: Calendar, label: "Booking Requests", value: stats.bookingRequests },
    { icon: Car, label: "Active Vehicles", value: stats.activeVehicles },
    { icon: DollarSign, label: "Return Journey Revenue", value: formatINR(stats.returnJourneyRevenue) },
    { icon: DollarSign, label: "Driver Vehicle Revenue", value: formatINR(stats.driverVehicleRevenue) },
    { icon: DollarSign, label: "Self Drive Revenue", value: formatINR(stats.selfDriveRevenue) },
    { icon: DollarSign, label: "Total Revenue", value: formatINR(stats.revenue) },
  ];

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Owner Dashboard</h1>
            <p className="text-gray-600">Manage vehicles, listings, bookings, and revenue</p>
            <p className={`mt-2 text-sm ${emailVerified ? "text-green-600" : "text-yellow-600"}`}>
              {emailVerified ? "Email verified" : "Email verification pending"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/vehicles/add" variant="outline" size="sm">Return Journey</Button>
            <Button href="/vehicles/self-drive" variant="outline" size="sm">Self Drive</Button>
            <Button href="/vehicles/driver" variant="primary" size="sm">With Driver</Button>
            <form action={signOutUser}>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 py-2 text-sm font-medium text-primary transition-all duration-300 hover:bg-primary hover:text-white"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {menu.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-medium text-secondary hover:bg-primary hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div id="revenue-summary" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
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
            <h2 className="mb-5 text-lg font-semibold text-secondary">Recent Vehicle Registrations</h2>
            {(stats.recentVehicles ?? []).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No vehicles available</p>
            ) : (
              <div className="space-y-4">
                {stats.recentVehicles?.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-secondary">{vehicle.vehicle_name}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {vehicle.vehicle_type} - {vehicle.vehicle_number || "No number"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="bookings" className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-secondary">Recent Bookings</h2>
            {(stats.recentBookings ?? []).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No bookings yet.</p>
            ) : (
              <div className="space-y-4">
                {stats.recentBookings?.map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-secondary">{booking.booking_type}</p>
                      <span className="font-semibold text-primary">{formatINR(booking.amount)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{booking.booking_status}</p>
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
