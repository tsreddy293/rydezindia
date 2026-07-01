import { notFound } from "next/navigation";
import { Calendar, IndianRupee, MapPin, Shield, Users } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import AuthAwareBookNowLink from "@/components/booking/AuthAwareBookNowLink";
import CancellationPolicyCard from "@/components/booking/CancellationPolicyCard";
import { buildBookingReturnPath } from "@/lib/booking/booking-return-path";
import { getVehicleListingById } from "@/lib/supabase/queries";
import { INCLUSIVE_TRIP_FARE_LABEL, INCLUSIVE_FARE_NOTE_GST, INCLUSIVE_FARE_NOTE_NO_HIDDEN } from "@/lib/booking/inclusive-fare-display";
import { estimateWithDriverTripFare, resolveTripDistanceKm } from "@/lib/pricing/with-driver-trip-fare";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tripType?: string; distanceKm?: string }>;
}

export default async function VehicleDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const vehicle = await getVehicleListingById(id);

  if (!vehicle) notFound();

  const isReturn = vehicle.module === "return_journey";
  const isSelfDrive = vehicle.module === "self_drive";
  const isWithDriver = vehicle.module === "with_driver";
  const distanceKm = resolveTripDistanceKm(sp.distanceKm);
  const tripType = mapDriverTripTypeLabel(sp.tripType) ?? "one_way";

  const withDriverListing = isWithDriver ? vehicle : null;
  const tripPricing =
    withDriverListing && distanceKm > 0
      ? estimateWithDriverTripFare({
          distanceKm,
          tripType,
          vehicleType: withDriverListing.vehicle_type,
          fuelType: withDriverListing.fuel_type,
          ratePerKm: withDriverListing.rate_per_km,
        })
      : null;

  const displayPrice = tripPricing?.finalFare ?? vehicle.price;
  const priceLabel = tripPricing
    ? `est. fare for ${distanceKm.toFixed(1)} km`
    : vehicle.price_label;

  const bookingHref = isReturn
    ? `/booking/${vehicle.id}`
    : buildBookingReturnPath(vehicle.id, {
        type: vehicle.module,
        tripType: sp.tripType,
        distanceKm: distanceKm > 0 ? String(distanceKm) : undefined,
      });

  const route =
    vehicle.module === "return_journey"
      ? `${vehicle.from_city} → ${vehicle.to_city}`
      : vehicle.drop_city
        ? `${vehicle.pickup_city} → ${vehicle.drop_city}`
        : vehicle.pickup_city;

  const policyType = isReturn ? "return_journey" : isSelfDrive ? "self_drive" : "with_driver";

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-2 text-sm font-medium text-primary">
                {isReturn ? "Return Journey" : isSelfDrive ? "Self Drive Rental" : "Vehicle With Driver"}
              </p>
              <h1 className="text-3xl font-bold text-secondary">{vehicle.vehicle_name}</h1>
              <p className="mt-2 text-gray-600">{vehicle.vehicle_type}</p>
            </div>
            <AuthAwareBookNowLink href={bookingHref} variant="primary" size="lg">
              Book Now
            </AuthAwareBookNowLink>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <MapPin className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Route / Location</p>
              <p className="font-semibold text-secondary">{route || "Available on request"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <Calendar className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Date & Time</p>
              <p className="font-semibold text-secondary">
                {vehicle.journey_date ? formatDate(vehicle.journey_date) : "Flexible"}
                {vehicle.journey_time ? `, ${vehicle.journey_time}` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <Users className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">Seats</p>
              <p className="font-semibold text-secondary">{vehicle.available_seats || 1}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <IndianRupee className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs text-gray-500">{tripPricing ? INCLUSIVE_TRIP_FARE_LABEL : "Price"}</p>
              <p className="font-semibold text-primary">
                {formatINR(displayPrice)}
                {!tripPricing ? ` / ${priceLabel}` : null}
              </p>
              {tripPricing ? (
                <>
                  <p className="mt-1 text-xs text-gray-500">For {distanceKm.toFixed(1)} km route</p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {INCLUSIVE_FARE_NOTE_GST} · {INCLUSIVE_FARE_NOTE_NO_HIDDEN}
                  </p>
                </>
              ) : isWithDriver && withDriverListing?.rate_per_km ? (
                <p className="mt-1 text-xs text-gray-500">
                  ₹{withDriverListing.rate_per_km}/km — search a route to see trip fare
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-100 p-5">
            <p className="flex items-center gap-2 font-semibold text-secondary">
              <Shield className="h-4 w-4 text-primary" />
              Verified Rydez India Listing
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Booking requests are confirmed after owner availability and passenger details are verified.
            </p>
          </div>

          <div className="mt-6">
            <CancellationPolicyCard bookingType={policyType} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
