import Link from "next/link";
import { Calendar, MapPin, Navigation } from "lucide-react";
import { isExcludedFromRiderDashboardAlerts } from "@/lib/rider/dashboard-booking-eligibility";
import type { RiderDashboardBooking } from "@/lib/rider/dashboard-types";
import RiderStatusBadge from "@/components/rider/dashboard/RiderStatusBadge";
import { formatDate, formatINR } from "@/lib/utils";

export default function UpcomingTripCard({ trip }: { trip: RiderDashboardBooking | null }) {
  if (!trip || isExcludedFromRiderDashboardAlerts(trip)) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
        <Navigation className="mx-auto h-10 w-10 text-gray-300" />
        <h2 className="mt-3 text-lg font-bold text-secondary">No Upcoming Trip</h2>
        <p className="mt-1 text-sm text-gray-500">Book your next ride to see trip details here.</p>
        <Link
          href="/search"
          className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25"
        >
          Explore Vehicles
        </Link>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-secondary via-secondary to-primary p-[1px] shadow-lg shadow-primary/15">
      <div className="rounded-[23px] bg-white p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Upcoming Trip</p>
            <h2 className="mt-1 text-xl font-bold text-secondary">{trip.bookingReference}</h2>
          </div>
          <RiderStatusBadge
            bookingStatus={trip.bookingStatus}
            paymentStatus={trip.paymentStatus}
            pickupDate={trip.pickupDate}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-secondary">{trip.pickupLocation ?? "Pickup"}</p>
                <p className="text-gray-500">→ {trip.dropLocation ?? "Drop"}</p>
              </div>
            </div>
            {trip.pickupDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                {formatDate(trip.pickupDate)}
                {trip.pickupTime ? ` · ${trip.pickupTime}` : ""}
              </div>
            )}
            <p className="text-lg font-bold text-primary">{formatINR(trip.amount)}</p>
            {trip.bookingType === "self_drive" &&
              trip.selfDrivePayment &&
              !isExcludedFromRiderDashboardAlerts(trip) &&
              trip.bookingStatus.toLowerCase() === "confirmed" &&
              trip.selfDrivePayment.amountPaid > 0 && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm">
                <p className="font-semibold text-emerald-900">Booking Confirmed</p>
                <p className="mt-1 text-gray-700">
                  Amount Paid {formatINR(trip.selfDrivePayment.amountPaid)} · Remaining Balance{" "}
                  <span className="font-semibold text-amber-700">
                    {formatINR(trip.selfDrivePayment.balanceDue)}
                  </span>
                </p>
                {trip.selfDrivePayment.balanceDue > 0 && (
                  <Link
                    href={`/booking/pay/${trip.id}`}
                    className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
                  >
                    Pay remaining balance before pickup →
                  </Link>
                )}
              </div>
            )}
          </div>

          {trip.vehicleImage && (
            <div className="relative h-24 w-36 overflow-hidden rounded-2xl bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trip.vehicleImage}
                alt={trip.vehicleName ?? "Vehicle"}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/booking/${trip.id}`}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-white"
          >
            View Trip
          </Link>
          <Link href="/dashboard/bookings" className="rounded-xl border px-4 py-2 text-sm font-medium text-secondary">
            All Bookings
          </Link>
        </div>
      </div>
    </section>
  );
}
