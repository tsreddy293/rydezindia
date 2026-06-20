import { Calendar, Car, Heart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import Button from "@/components/ui/Button";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import { getSavedVehicles, getUserBookings } from "@/lib/supabase/queries";
import { formatDate, formatINR } from "@/lib/utils";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { requireRole, signOutUser } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ passwordError?: string; passwordSuccess?: string }>;
}

export default async function UserDashboardPage({ searchParams }: Props) {
  const { user } = await requireRole("user");
  const { passwordError, passwordSuccess } = await searchParams;
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);

  const [bookings, saved, kyc] = await Promise.all([
    getUserBookings(user.id),
    getSavedVehicles(user.id),
    getCustomerKycStatus(user.id),
  ]);

  const activeTrips = bookings.filter((b) => ["confirmed", "pending"].includes(b.booking_status));
  const completedTrips = bookings.filter((b) => b.booking_status === "completed");

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">My Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and saved vehicles</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="/dashboard/kyc" variant="primary" size="sm">
              Upload KYC Documents
            </Button>
            <span className={`px-4 py-2 rounded-xl text-sm ${emailVerified ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {emailVerified ? "Email verified" : "Email not verified"}
            </span>
            <form action={signOutUser}>
              <button type="submit" className="rounded-xl border-2 border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white">
                Logout
              </button>
            </form>
          </div>
        </div>

        <UserDashboardNav />

        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-7 w-7 text-primary shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-secondary">KYC Document Upload</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Status:{" "}
                  <span className="font-medium capitalize text-secondary">{kyc.status.replace("_", " ")}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {kyc.status === "approved"
                    ? "Your documents are approved."
                    : kyc.status === "pending"
                      ? "Documents submitted — waiting for admin approval."
                      : kyc.status === "rejected"
                        ? "Please re-upload Aadhaar Front, Aadhaar Back, and Driving License."
                        : "Upload Aadhaar Front, Aadhaar Back, and Driving License (Selfie optional)."}
                </p>
              </div>
            </div>
            <Button href="/dashboard/kyc" variant="primary">
              {kyc.status === "approved" ? "View KYC" : "Upload KYC Documents"}
            </Button>
          </div>
        </section>

        {kyc.status !== "approved" && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-secondary">Complete KYC Verification</h2>
                <p className="text-sm text-amber-800 mt-1">
                  {kyc.status === "pending"
                    ? "Your documents are under admin review."
                    : kyc.status === "rejected"
                      ? "KYC was rejected. Please re-upload your documents."
                      : "Upload Aadhaar Front, Aadhaar Back, and Driving License so admin can approve your account."}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/kyc"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
            >
              {kyc.hasRequiredDocs ? "View KYC Status" : "Upload Documents"}
            </Link>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl bg-white border p-6 shadow-sm">
            <Calendar className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{bookings.length}</p>
            <p className="text-sm text-gray-500">Total Bookings</p>
          </div>
          <div className="rounded-2xl bg-white border p-6 shadow-sm">
            <Car className="h-6 w-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{activeTrips.length}</p>
            <p className="text-sm text-gray-500">Active Trips</p>
          </div>
          <div className="rounded-2xl bg-white border p-6 shadow-sm">
            <Heart className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-2xl font-bold">{saved.length}</p>
            <p className="text-sm text-gray-500">Saved Vehicles</p>
          </div>
        </div>

        <section className="rounded-2xl bg-white border p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-secondary">Recent Bookings</h3>
            <Button href="/user/bookings" variant="outline" size="sm">View All</Button>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-10 rounded-xl bg-gray-50">
              <Car className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No bookings yet.</p>
              <Button href="/search" variant="primary">Book a Vehicle</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="font-medium">{b.booking_reference ?? b.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">{formatDate(b.created_at)} · {b.booking_status}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatINR(b.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl bg-white border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Active Trips ({activeTrips.length})</h3>
            {activeTrips.length === 0 ? (
              <p className="text-gray-500 text-sm">No active trips</p>
            ) : (
              activeTrips.slice(0, 3).map((b) => (
                <p key={b.id} className="text-sm py-2 border-b">{b.pickup_location} → {b.drop_location}</p>
              ))
            )}
          </section>
          <section className="rounded-2xl bg-white border p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Completed ({completedTrips.length})</h3>
            {completedTrips.length === 0 ? (
              <p className="text-gray-500 text-sm">No completed trips</p>
            ) : (
              completedTrips.slice(0, 3).map((b) => (
                <p key={b.id} className="text-sm py-2 border-b">{b.pickup_location} → {b.drop_location}</p>
              ))
            )}
          </section>
        </div>

        <div className="mt-8">
          <ChangePasswordForm returnTo="/dashboard" error={passwordError} success={passwordSuccess} />
        </div>
      </div>
    </PageLayout>
  );
}
