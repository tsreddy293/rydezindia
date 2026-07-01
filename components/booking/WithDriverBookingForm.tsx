"use client";

import { useCallback, useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import BookingCustomerDetails from "@/components/booking/BookingCustomerDetails";
import CancellationPolicyAccordion from "@/components/booking/CancellationPolicyAccordion";
import { InclusiveTripFareRow } from "@/components/booking/InclusiveFareDisplay";
import WithDriverTripSummary from "@/components/booking/WithDriverTripSummary";
import WithDriverVehicleCard from "@/components/booking/WithDriverVehicleCard";
import { useBookingAuthReady } from "@/components/booking/BookingAuthContext";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import { calculateLocalRentalPricing } from "@/lib/pricing/local-rental-pricing";
import {
  estimateWithDriverTripFare,
  resolveTripDistanceKm,
} from "@/lib/pricing/with-driver-trip-fare";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { LOCAL_RENTAL_PACKAGES } from "@/lib/maps/constants";
import { loadBookingSearchDraft, saveBookingSearchDraft } from "@/lib/booking/booking-draft";
import { formatINR } from "@/lib/utils";
import type { RiderBookingProfile } from "@/lib/users/rider-profile";
import type { DriverVehicleResult } from "@/types/database";

interface Props {
  listing: DriverVehicleResult;
  customer: RiderBookingProfile;
  tripType?: string;
  distanceKm?: number;
  localRentalPackage?: string;
  extraHours?: number;
  extraKm?: number;
}

function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export default function WithDriverBookingForm({
  listing,
  customer,
  tripType: tripTypeInitial,
  distanceKm = 0,
  localRentalPackage,
  extraHours: extraHoursInitial = 0,
  extraKm: extraKmInitial = 0,
}: Props) {
  const router = useRouter();
  const policyCheckboxId = useId();
  const authReady = useBookingAuthReady();

  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [paymentType, setPaymentType] = useState<"advance" | "full">("advance");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");

  const isLocalRental = String(tripTypeInitial ?? "").toLowerCase() === "local rental";
  const packageLabel =
    LOCAL_RENTAL_PACKAGES.find((pkg) => pkg.key === localRentalPackage)?.label ??
    localRentalPackage;

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [tripType, setTripType] = useState(tripTypeInitial ?? "One Way");
  const [extraHours, setExtraHours] = useState(extraHoursInitial);
  const [extraKm, setExtraKm] = useState(extraKmInitial);

  const pricingTripType = mapDriverTripTypeLabel(tripType) ?? "one_way";

  const driverPricing = useMemo(() => {
    if (isLocalRental && localRentalPackage) {
      return calculateLocalRentalPricing({
        packageKey: localRentalPackage,
        extraHours,
        extraKm,
        vehicleType: listing.vehicle_type,
      });
    }
    return estimateWithDriverTripFare({
      distanceKm: resolveTripDistanceKm(distanceKm),
      tripType: pricingTripType,
      vehicleType: listing.vehicle_type,
      fuelType: listing.fuel_type,
      ratePerKm: listing.rate_per_km,
    });
  }, [
    distanceKm,
    extraHours,
    extraKm,
    isLocalRental,
    listing,
    localRentalPackage,
    pricingTripType,
  ]);

  const totalFare =
    isLocalRental && driverPricing && "totalFare" in driverPricing
      ? driverPricing.totalFare
      : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).finalFare;

  const payAmount = getAdvancePaymentAmount(totalFare, paymentType);

  const handlePaymentError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const draft = loadBookingSearchDraft();
      setPickupLocation(firstNonEmpty(draft.pickupLocation, listing.pickup_city));
      setDropLocation(firstNonEmpty(draft.dropLocation, listing.drop_city));
      setPickupDate(firstNonEmpty(draft.pickupDate, listing.journey_date));
      setPickupTime(firstNonEmpty(draft.pickupTime, listing.journey_time));
      setTripType(tripTypeInitial ?? "One Way");
      setExtraHours(extraHoursInitial);
      setExtraKm(extraKmInitial);
      setDraftLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, extraHoursInitial, extraKmInitial, listing, tripTypeInitial]);

  useEffect(() => {
    if (!draftLoaded) return;
    saveBookingSearchDraft({
      pickupLocation,
      dropLocation,
      pickupDate,
      pickupTime,
      serviceType: "with_driver",
    });
  }, [draftLoaded, pickupLocation, dropLocation, pickupDate, pickupTime]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer.name.trim() || !customer.mobile.trim()) {
      setError("Your account profile is missing name or mobile. Update your profile and try again.");
      return;
    }
    if (!pickupLocation.trim()) {
      setError("Pickup location is required.");
      return;
    }
    if (!pickupDate) {
      setError("Pickup date is required.");
      return;
    }
    if (!policyAgreed) {
      setError("Please read and agree to the Cancellation Policy before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    const result = await createUnifiedBooking({
      booking_type: "with_driver",
      reference_id: listing.id,
      vehicle_id: listing.vehicle_id,
      owner_id: listing.owner_id,
      passenger_name: customer.name,
      mobile: customer.mobile,
      amount: totalFare,
      pickup_location: pickupLocation,
      drop_location: dropLocation,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      trip_type: tripType,
      driver_required: true,
      special_instructions: specialInstructions.trim() || undefined,
      base_fare:
        isLocalRental && driverPricing && "adjustedBasePrice" in driverPricing
          ? driverPricing.adjustedBasePrice +
            driverPricing.extraHourCharge +
            driverPricing.extraKmCharge
          : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).baseFare,
      platform_fee:
        isLocalRental && driverPricing && "platformFee" in driverPricing
          ? driverPricing.platformFee
          : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).platformFee,
      discount_amount:
        (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount ?? 0,
      trip_fare_amount: totalFare,
      local_rental_package: isLocalRental ? localRentalPackage : undefined,
      extra_hours: isLocalRental ? extraHours : undefined,
      extra_km: isLocalRental ? extraKm : undefined,
      vehicle_type: listing.vehicle_type,
    });

    if (result.success) {
      setBookingId(result.data!.id);
      setBookingReference(result.data!.bookingReference);
      setStep("payment");
    } else {
      setError(result.error ?? "Booking failed");
    }
    setLoading(false);
  }

  const termsCheckbox = (
    <label
      htmlFor={policyCheckboxId}
      className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
    >
      <input
        id={policyCheckboxId}
        type="checkbox"
        checked={policyAgreed}
        onChange={(e) => setPolicyAgreed(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="text-xs leading-relaxed text-gray-600">
        I agree to the Terms &amp; Conditions and Cancellation Policy.
      </span>
    </label>
  );

  const fareSummary = (
    <div className="space-y-3">
      {isLocalRental && driverPricing && "packageLabel" in driverPricing && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Package</span>
          <span className="font-medium text-secondary">{driverPricing.packageLabel}</span>
        </div>
      )}
      {!isLocalRental &&
        (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>Discount</span>
            <span>
              -
              {formatINR(
                (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount
              )}
            </span>
          </div>
        )}
      <InclusiveTripFareRow amount={totalFare} variant="light" />
    </div>
  );

  if (!authReady) return null;

  if (!draftLoaded) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center text-gray-500 shadow-sm">
        Loading booking details...
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-6 rounded-2xl border bg-white p-8 text-center shadow-sm sm:p-10">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-secondary">Booking Confirmed!</h2>
        <p className="text-gray-600">Booking ID: {bookingReference}</p>
        <Button href={`/booking/confirmation/${bookingId}`} variant="primary">
          View Confirmation
        </Button>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-bold text-secondary">Complete Payment</h2>
          <p className="mt-1 text-xs text-gray-500">Choose advance or full payment to confirm your trip.</p>
          <div className="mt-4 space-y-3">{fareSummary}</div>
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <input
                type="radio"
                name="pay_type"
                checked={paymentType === "advance"}
                onChange={() => setPaymentType("advance")}
              />
              <div>
                <p className="text-sm font-medium text-secondary">Advance Payment (30%)</p>
                <p className="text-xs text-gray-500">
                  {formatINR(getAdvancePaymentAmount(totalFare, "advance"))}
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <input
                type="radio"
                name="pay_type"
                checked={paymentType === "full"}
                onChange={() => setPaymentType("full")}
              />
              <div>
                <p className="text-sm font-medium text-secondary">Full Payment</p>
                <p className="text-xs text-gray-500">{formatINR(totalFare)}</p>
              </div>
            </label>
          </div>
        </div>
        <RazorpayCheckout
          bookingId={bookingId}
          amount={payAmount}
          customerName={customer.name}
          customerMobile={customer.mobile}
          paymentType={paymentType}
          onSuccess={() => {
            setStep("done");
            router.refresh();
          }}
          onError={handlePaymentError}
        />
        {error && <p className="text-sm text-red-500 lg:col-span-2">{error}</p>}
        <Button
          variant="outline"
          className="lg:col-span-2"
          onClick={() => router.push(`/booking/confirmation/${bookingId}`)}
        >
          Skip payment for now
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 pb-28 lg:grid-cols-5 lg:gap-8 lg:pb-0">
      <div className="order-2 space-y-4 lg:order-1 lg:col-span-3">
        <WithDriverVehicleCard listing={listing} />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <WithDriverTripSummary
            values={{
              pickupLocation,
              dropLocation,
              pickupDate,
              pickupTime,
              tripType,
              extraHours,
              extraKm,
            }}
            editing={editingTrip}
            isLocalRental={isLocalRental}
            localRentalPackageLabel={packageLabel}
            onEdit={() => setEditingTrip(true)}
            onCancelEdit={() => setEditingTrip(false)}
            onChange={(key, value) => {
              if (key === "pickupLocation") setPickupLocation(String(value));
              if (key === "dropLocation") setDropLocation(String(value));
              if (key === "pickupDate") setPickupDate(String(value));
              if (key === "pickupTime") setPickupTime(String(value));
              if (key === "tripType") setTripType(String(value));
              if (key === "extraHours") setExtraHours(Number(value) || 0);
              if (key === "extraKm") setExtraKm(Number(value) || 0);
            }}
          />

          <div className="mt-4">
            <BookingCustomerDetails
              name={customer.name}
              mobile={customer.mobile}
              email={customer.email}
              kycApproved={customer.kycApproved}
              mobileVerified={customer.mobileVerified}
            />
          </div>

          <div className="mt-4">
            <FormField
              label="Special Instructions"
              name="special_instructions"
              as="textarea"
              placeholder="Any special requests for your trip..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <aside className="order-1 lg:order-2 lg:col-span-2 lg:sticky lg:top-20 lg:z-10 lg:self-start">
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
          <h2 className="text-lg font-bold text-secondary">Payment Summary</h2>
          {fareSummary}
          <CancellationPolicyAccordion bookingType="with_driver" tripType={tripType} />
          <div className="hidden space-y-3 border-t border-gray-100 pt-3 lg:block">
            {termsCheckbox}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading || !policyAgreed}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Creating booking...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
            {!policyAgreed && (
              <p className="text-center text-[11px] text-gray-400">Accept terms to continue</p>
            )}
          </div>
        </div>
      </aside>

      <div
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-2 max-w-lg">{termsCheckbox}</div>
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              Trip Fare (Incl. GST)
            </p>
            <p className="text-xl font-bold tabular-nums text-primary">{formatINR(totalFare)}</p>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 px-6"
            disabled={loading || !policyAgreed}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue to Payment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
