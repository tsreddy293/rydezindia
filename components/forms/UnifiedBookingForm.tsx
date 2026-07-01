"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import {
  estimateWithDriverTripFare,
  resolveTripDistanceKm,
} from "@/lib/pricing/with-driver-trip-fare";
import { calculateLocalRentalPricing } from "@/lib/pricing/local-rental-pricing";
import {
  calculateSelfDriveCheckoutAmount,
  calculateSelfDrivePricingForSchedule,
  resolveSelfDriveDailyRent,
  resolveSelfDriveDepositInfo,
} from "@/lib/pricing/self-drive-pricing";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { formatINR } from "@/lib/utils";
import KycVerifiedNotice from "@/components/booking/KycVerifiedNotice";
import MobileVerifiedNotice from "@/components/booking/MobileVerifiedNotice";
import { InclusiveFareNotes, InclusiveTripFareRow } from "@/components/booking/InclusiveFareDisplay";
import SelfDriveFareSummary from "@/components/booking/SelfDriveFareSummary";
import CancellationPolicyCard from "@/components/booking/CancellationPolicyCard";
import FlexibleCancellationAddon from "@/components/booking/FlexibleCancellationAddon";
import { loadBookingSearchDraft } from "@/lib/booking/booking-draft";
import {
  isLoggedInRiderMobileTrusted,
  isValidBookingMobile,
} from "@/lib/booking/booking-mobile-verification";
import { getProtectionFeeForVehicle } from "@/lib/services/flexible-cancellation-protection";
import type { RiderBookingProfile } from "@/lib/users/rider-profile";
import type { DriverVehicleResult, SelfDriveResult } from "@/types/database";

type Props =
  | {
      type: "self_drive";
      listing: SelfDriveResult;
      distanceKm?: number;
      customerPrefill?: RiderBookingProfile | null;
      kycApproved?: boolean;
    }
  | {
      type: "with_driver";
      listing: DriverVehicleResult;
      distanceKm?: number;
      tripType?: string;
      localRentalPackage?: string;
      extraHours?: number;
      extraKm?: number;
      customerPrefill?: RiderBookingProfile | null;
    };

function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export default function UnifiedBookingForm(props: Props) {
  const { type, listing, distanceKm = 0, customerPrefill = null } = props;
  const profileKycApproved =
    customerPrefill?.kycApproved ?? (type === "self_drive" ? Boolean(props.kycApproved) : false);
  const tripType = type === "with_driver" ? props.tripType : undefined;
  const isLocalRental = String(tripType ?? "").toLowerCase() === "local rental";
  const localRentalPackage = type === "with_driver" ? props.localRentalPackage : undefined;
  const [extraHours, setExtraHours] = useState(type === "with_driver" ? props.extraHours ?? 0 : 0);
  const [extraKm, setExtraKm] = useState(type === "with_driver" ? props.extraKm ?? 0 : 0);
  const router = useRouter();
  const policyCheckboxId = useId();
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [paymentType, setPaymentType] = useState<"advance" | "full">("advance");
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [flexibleCancellation, setFlexibleCancellation] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const accountLocked = Boolean(customerPrefill?.email || customerPrefill?.mobile);
  const trustedAccountMobile = isLoggedInRiderMobileTrusted({
    enteredMobile: customerMobile,
    profileMobile: customerPrefill?.mobile,
  });
  const mobileReady = isValidBookingMobile(customerMobile);

  useEffect(() => {
    const draft = loadBookingSearchDraft();
    const listingPickupFallback =
      type === "self_drive" ? (listing as SelfDriveResult).owner_city : undefined;
    const prefilledMobile = firstNonEmpty(customerPrefill?.mobile);

    setCustomerName(firstNonEmpty(customerPrefill?.name));
    setCustomerEmail(firstNonEmpty(customerPrefill?.email));
    setCustomerMobile(prefilledMobile);
    setPickupLocation(
      firstNonEmpty(draft.pickupLocation, listing.pickup_city, listingPickupFallback)
    );
    setDropLocation(firstNonEmpty(draft.dropLocation, listing.drop_city));
    setPickupDate(firstNonEmpty(draft.pickupDate, listing.journey_date));
    setPickupTime(firstNonEmpty(draft.pickupTime, listing.journey_time));
    setReturnDate(draft.returnDate);
    setReturnTime(draft.returnTime);
    setDraftLoaded(true);
  }, [customerPrefill, listing, type]);

  const isSelfDrive = type === "self_drive";
  const pricingTripType = mapDriverTripTypeLabel(tripType) ?? "one_way";

  const selfDriveListing = isSelfDrive ? (listing as SelfDriveResult) : null;
  const selfDrivePricing = useMemo(
    () =>
      isSelfDrive
        ? calculateSelfDrivePricingForSchedule(
            resolveSelfDriveDailyRent(selfDriveListing!),
            resolveSelfDriveDepositInfo(selfDriveListing!),
            { pickupDate, pickupTime, returnDate, returnTime }
          )
        : null,
    [isSelfDrive, selfDriveListing, pickupDate, pickupTime, returnDate, returnTime]
  );

  const driverPricing = useMemo(() => {
    if (isSelfDrive) return null;
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
      fuelType: (listing as DriverVehicleResult).fuel_type,
      ratePerKm: (listing as DriverVehicleResult).rate_per_km,
    });
  }, [
    distanceKm,
    extraHours,
    extraKm,
    isLocalRental,
    isSelfDrive,
    listing,
    localRentalPackage,
    pricingTripType,
  ]);

  const totalFare = isSelfDrive
    ? selfDrivePricing!.payableAmount
    : isLocalRental && driverPricing && "totalFare" in driverPricing
      ? driverPricing.totalFare
      : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).finalFare;
  const protectionFee = isSelfDrive ? getProtectionFeeForVehicle(listing.vehicle_type) : 0;
  const payAmount =
    isSelfDrive && selfDrivePricing
      ? calculateSelfDriveCheckoutAmount(selfDrivePricing, paymentType) +
        (flexibleCancellation ? protectionFee : 0)
      : getAdvancePaymentAmount(totalFare, paymentType);

  const policyBookingType = isSelfDrive ? "self_drive" : "with_driver";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mobileReady) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!policyAgreed) {
      setError("Please agree to the Terms & Conditions before continuing.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createUnifiedBooking({
      booking_type: type,
      reference_id: listing.id,
      vehicle_id: listing.vehicle_id,
      owner_id: (listing as DriverVehicleResult).owner_id ?? (listing as SelfDriveResult).owner_id,
      passenger_name: customerName,
      mobile: customerMobile,
      amount: totalFare,
      pickup_location: pickupLocation,
      drop_location: dropLocation,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      trip_type: tripType ?? "One Way",
      driver_required: !isSelfDrive,
      special_instructions: String(new FormData(e.currentTarget).get("special_instructions") ?? ""),
      base_fare: isSelfDrive
        ? selfDrivePricing!.discountedVehicleRentTotal
        : isLocalRental && driverPricing && "adjustedBasePrice" in driverPricing
          ? driverPricing.adjustedBasePrice + driverPricing.extraHourCharge + driverPricing.extraKmCharge
          : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).baseFare,
      platform_fee: isSelfDrive
        ? selfDrivePricing!.platformFee
        : isLocalRental && driverPricing && "platformFee" in driverPricing
          ? driverPricing.platformFee
          : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).platformFee,
      discount_amount: isSelfDrive ? 0 : (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount ?? 0,
      trip_fare_amount: totalFare,
      local_rental_package: isLocalRental ? localRentalPackage : undefined,
      extra_hours: isLocalRental ? extraHours : undefined,
      extra_km: isLocalRental ? extraKm : undefined,
      security_deposit_amount: isSelfDrive ? selfDrivePricing!.deposit.amount : 0,
      protection_selected: isSelfDrive ? flexibleCancellation : false,
      protection_fee: isSelfDrive && flexibleCancellation ? protectionFee : 0,
      vehicle_type: listing.vehicle_type,
      coupon_code: couponCode.trim() || undefined,
      wallet_amount_used: Number(new FormData(e.currentTarget).get("wallet_amount") ?? 0) || undefined,
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

  if (!draftLoaded) {
    return (
      <div className="rounded-2xl bg-white border p-10 text-center text-gray-500 shadow-sm">
        Loading booking details...
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl bg-white border p-10 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-secondary mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 mb-2">Booking ID: {bookingReference}</p>
        <Button href={`/booking/confirmation/${bookingId}`} variant="primary">
          View Confirmation
        </Button>
      </div>
    );
  }

  if (step === "payment") {
    return (
      <div className="space-y-6">
        <CancellationPolicyCard bookingType={policyBookingType} tripType={tripType} compact />
        <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
          <h2 className="text-xl font-bold">Payment Options</h2>
          {isSelfDrive && selfDrivePricing ? (
            <>
              <SelfDriveFareSummary
                pricing={selfDrivePricing}
                paymentType={paymentType}
                showLineItems={false}
                protectionSelected={flexibleCancellation}
                protectionFee={protectionFee}
              />
              <div className="space-y-3 border-t border-white/15 pt-4">
                <label className="flex items-center gap-3 rounded-xl bg-white/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="pay_type"
                    checked={paymentType === "advance"}
                    onChange={() => setPaymentType("advance")}
                  />
                  <div>
                    <p className="font-medium">Advance Payment (30% trip fare)</p>
                    <p className="text-sm text-white/70">
                      {formatINR(calculateSelfDriveCheckoutAmount(selfDrivePricing, "advance"))}
                      {selfDrivePricing.deposit.collectedAtPickup ? " · deposit at pickup" : " incl. deposit"}
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-white/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="pay_type"
                    checked={paymentType === "full"}
                    onChange={() => setPaymentType("full")}
                  />
                  <div>
                    <p className="font-medium">Full Payment</p>
                    <p className="text-sm text-white/70">
                      {formatINR(calculateSelfDriveCheckoutAmount(selfDrivePricing, "full"))}
                      {selfDrivePricing.deposit.collectedAtPickup ? " · deposit at pickup" : " incl. deposit"}
                    </p>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-xl bg-white/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="pay_type"
                    checked={paymentType === "advance"}
                    onChange={() => setPaymentType("advance")}
                  />
                  <div>
                    <p className="font-medium">Advance Payment (30%)</p>
                    <p className="text-sm text-white/70">{formatINR(getAdvancePaymentAmount(totalFare, "advance"))}</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-white/10 p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="pay_type"
                    checked={paymentType === "full"}
                    onChange={() => setPaymentType("full")}
                  />
                  <div>
                    <p className="font-medium">Full Payment</p>
                    <p className="text-sm text-white/70">{formatINR(totalFare)}</p>
                  </div>
                </label>
              </div>
              <InclusiveTripFareRow amount={totalFare} variant="dark" showNotes={false} />
              <InclusiveFareNotes variant="dark" />
              <p className="text-sm text-white/60">Choose advance or full payment below.</p>
            </>
          )}
        </div>
        <RazorpayCheckout
          bookingId={bookingId}
          amount={payAmount}
          customerName={customerName}
          customerMobile={customerMobile}
          paymentType={paymentType}
          onSuccess={() => {
            setStep("done");
            router.refresh();
          }}
          onError={(msg) => setError(msg)}
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <Button
          variant="outline"
          className="lg:col-span-2"
          onClick={() => router.push(`/booking/confirmation/${bookingId}`)}
        >
          Skip payment for now
        </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl bg-secondary text-white p-6 space-y-4 h-fit">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Vehicle Summary</p>
        <h2 className="text-xl font-bold">{listing.vehicle_name}</h2>
        <p className="text-white/70 text-sm">{listing.vehicle_type}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {dropLocation ? `${pickupLocation} → ${dropLocation}` : pickupLocation || listing.pickup_city}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Owner: {listing.owner_name}
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/60">Fare Summary</p>
          {isSelfDrive && selfDrivePricing ? (
            <SelfDriveFareSummary
              pricing={selfDrivePricing}
              paymentType="full"
              protectionSelected={flexibleCancellation}
              protectionFee={protectionFee}
            />
          ) : driverPricing ? (
            <div className="space-y-3 text-sm">
              {isLocalRental && "packageLabel" in driverPricing && (
                <div className="flex justify-between text-white/80">
                  <span>Package</span>
                  <span>{driverPricing.packageLabel}</span>
                </div>
              )}
              {isLocalRental && "extraHourCharge" in driverPricing && driverPricing.extraHourCharge > 0 && (
                <div className="flex justify-between text-white/80">
                  <span>Extra hours ({driverPricing.extraHours})</span>
                  <span>{formatINR(driverPricing.extraHourCharge)}</span>
                </div>
              )}
              {isLocalRental && "extraKmCharge" in driverPricing && driverPricing.extraKmCharge > 0 && (
                <div className="flex justify-between text-white/80">
                  <span>Extra km ({driverPricing.extraKm})</span>
                  <span>{formatINR(driverPricing.extraKmCharge)}</span>
                </div>
              )}
              {!isLocalRental && (driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount > 0 && (
                <div className="flex justify-between text-green-300">
                  <span>Discount</span>
                  <span>
                    -{formatINR((driverPricing as ReturnType<typeof estimateWithDriverTripFare>).discountAmount)}
                  </span>
                </div>
              )}
              <InclusiveTripFareRow amount={totalFare} variant="dark" size="large" />
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-bold text-secondary">Customer Details</h2>
        <p className="text-sm text-gray-500">
          Your search details and account info are pre-filled. You can edit locations and dates below.
        </p>
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        <FormField
          label="Customer Name"
          name="passenger_name"
          required
          placeholder="Your full name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          value={customerEmail}
          readOnly={accountLocked && Boolean(customerEmail)}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
        <FormField
          label="Mobile Number"
          name="mobile"
          type="tel"
          required
          placeholder="9876543210"
          value={customerMobile}
          readOnly={accountLocked && Boolean(customerPrefill?.mobile)}
          onChange={(e) => setCustomerMobile(e.target.value)}
        />
        {profileKycApproved && <KycVerifiedNotice />}
        {trustedAccountMobile && <MobileVerifiedNotice mobile={customerMobile} />}
        <FormField
          label="Pickup Location"
          name="pickup_location"
          required
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
        />
        <FormField
          label="Drop Location"
          name="drop_location"
          value={dropLocation}
          onChange={(e) => setDropLocation(e.target.value)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Pickup Date"
            name="pickup_date"
            type="date"
            required
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />
          <FormField
            label="Pickup Time"
            name="pickup_time"
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
          />
        </div>
        {isSelfDrive && (
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Return Date"
              name="return_date"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            <FormField
              label="Return Time"
              name="return_time"
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
            />
          </div>
        )}
        {!isSelfDrive && (
          <>
            {!isLocalRental && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Trip Type</span>
                <select name="trip_type" defaultValue={tripType ?? "One Way"} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
                  <option>One Way</option>
                  <option>Round Trip</option>
                  <option>Multi-City</option>
                </select>
              </label>
            )}
            {isLocalRental && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Extra Hours (beyond package)"
                  name="extra_hours"
                  type="number"
                  value={String(extraHours)}
                  onChange={(e) => setExtraHours(Number(e.target.value) || 0)}
                />
                <FormField
                  label="Extra KM (beyond package)"
                  name="extra_km"
                  type="number"
                  value={String(extraKm)}
                  onChange={(e) => setExtraKm(Number(e.target.value) || 0)}
                />
              </div>
            )}
            <label className="flex items-center gap-3">
              <input type="checkbox" name="driver_required" defaultChecked className="h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">Driver Required</span>
            </label>
          </>
        )}
        <FormField label="Special Instructions" name="special_instructions" as="textarea" placeholder="Any special requests..." />

        <section className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <h3 className="text-sm font-semibold text-secondary">Payment Summary</h3>
          {!isSelfDrive && driverPricing && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Trip fare due at checkout</span>
              <span className="font-bold text-secondary">{formatINR(totalFare)}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="WELCOME100"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm uppercase"
              />
            </div>
            <FormField label="Use Wallet (₹)" name="wallet_amount" type="number" placeholder="0" />
          </div>
          {isSelfDrive && (
            <FlexibleCancellationAddon
              vehicleType={listing.vehicle_type}
              checked={flexibleCancellation}
              onChange={setFlexibleCancellation}
            />
          )}
        </section>

        <CancellationPolicyCard bookingType={policyBookingType} tripType={tripType} />

        <label
          htmlFor={policyCheckboxId}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <input
            id={policyCheckboxId}
            type="checkbox"
            checked={policyAgreed}
            onChange={(e) => setPolicyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            I agree to the Terms &amp; Conditions and Cancellation Policy.
          </span>
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading || !mobileReady || !policyAgreed}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Creating booking...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>
      </form>
      </div>
    </div>
  );
}
