import Link from "next/link";
import { Calendar, Car, CheckCircle, Clock, DollarSign, Plus, Route, ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import Button from "@/components/ui/Button";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import { getOwnerDashboardMetrics, getOwnerStats } from "@/lib/supabase/queries";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
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
  const [metrics, stats, kyc] = await Promise.all([
    getOwnerDashboardMetrics(user.id),
    getOwnerStats(user.id),
    getOwnerKycStatus(),
  ]);
  const notifications = await listNotifications({ recipientId: user.id, recipientRole: "owner", limit: 10 });

  const ownerName =
    String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").trim() || "Owner";

  const vehicleCards = [
    { icon: Car, label: "Total Vehicles", value: metrics.totalVehicles, accent: "text-primary" },
    { icon: CheckCircle, label: "Approved Vehicles", value: metrics.approvedVehicles, accent: "text-green-600" },
    { icon: Clock, label: "Pending Vehicles", value: metrics.pendingVehicles, accent: "text-amber-600" },
  ];

  const activityCards = [
    { icon: Route, label: "Active Bookings", value: metrics.activeBookings },
    { icon: Calendar, label: "Upcoming Trips", value: metrics.upcomingTrips },
    { icon: DollarSign, label: "Earnings Today", value: formatINR(metrics.earningsToday) },
    { icon: DollarSign, label: "Earnings This Month", value: formatINR(metrics.earningsThisMonth) },
  ];

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">Welcome, {ownerName}</h1>
            <p className="text-gray-600 mt-1">Manage your vehicles, bookings, and earnings</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/owner/add-vehicle" variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
            <Button href="/owner/my-vehicles" variant="outline" size="sm">My Vehicles</Button>
            <form action={signOutUser}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border-2 border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white"
              >
                Logout
              </button>
            </form>
          </div>
        </div>

        <OwnerDashboardNav />

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-gray-500">KYC Status</p>
                <KycStatusBadge status={kyc.status} />
                {!kyc.hasRequiredDocs && kyc.status !== "verified" && (
                  <p className="text-xs text-amber-600 mt-1">Upload documents to complete verification</p>
                )}
              </div>
            </div>
            <Button href="/owner/kyc" variant="outline" size="sm">
              {kyc.hasRequiredDocs ? "View KYC" : "Upload KYC Documents"}
            </Button>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Owner Account Status</p>
            <p
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${
                kyc.ownerStatus === "approved"
                  ? "bg-green-100 text-green-700"
                  : kyc.ownerStatus === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {kyc.ownerStatus}
            </p>
            {kyc.ownerStatus !== "approved" && kyc.status === "verified" && (
              <p className="text-xs text-gray-500 mt-2">KYC approved — waiting for admin owner approval.</p>
            )}
            {kyc.ownerStatus !== "approved" && kyc.status !== "verified" && (
              <p className="text-xs text-gray-500 mt-2">Complete KYC first, then admin will approve your owner account.</p>
            )}
          </div>
        </div>

        {metrics.totalVehicles === 0 && (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 md:p-8">
            <h2 className="text-lg font-bold text-secondary mb-2">Add your first vehicle</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-2xl">
              Your account is ready. Add vehicle details, upload RC, insurance, and photos — then submit for admin approval.
              You can register unlimited vehicles on one owner account.
            </p>
            <Button href="/owner/add-vehicle" variant="primary">
              <Plus className="h-5 w-5" />
              Add Your First Vehicle
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {vehicleCards.map(({ icon: Icon, label, value, accent }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <Icon className={`h-8 w-8 mb-3 ${accent}`} />
              <p className="text-3xl font-bold text-secondary">{value.toLocaleString("en-IN")}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {activityCards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
              <Icon className="h-6 w-6 text-primary mb-2" />
              <p className="text-xl font-bold text-secondary">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-secondary">Recent Vehicles</h2>
              <Link href="/owner/my-vehicles" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {(stats.recentVehicles ?? []).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">No vehicles yet</p>
            ) : (
              <div className="space-y-4">
                {stats.recentVehicles?.slice(0, 5).map((vehicle) => (
                  <div key={vehicle.id} className="rounded-xl bg-gray-50 p-4 flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-secondary">{vehicle.vehicle_name}</p>
                      <p className="text-sm text-gray-500">{vehicle.vehicle_type}</p>
                    </div>
                    <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary h-fit shrink-0 capitalize">
                      {vehicle.status}
                    </span>
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
