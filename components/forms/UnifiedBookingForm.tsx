"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import { calculateAiPricing, getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import {
  calculateSelfDriveCheckoutAmount,
  calculateSelfDrivePricingForSchedule,
  resolveSelfDriveDailyRent,
  resolveSelfDriveDepositInfo,
} from "@/lib/pricing/self-drive-pricing";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { formatINR } from "@/lib/utils";
import BookingOtpVerification from "@/components/booking/BookingOtpVerification";
import KycVerifiedNotice from "@/components/booking/KycVerifiedNotice";
import SelfDriveFareSummary from "@/components/booking/SelfDriveFareSummary";
import CancellationPolicyCard from "@/components/booking/CancellationPolicyCard";
import FlexibleCancellationAddon from "@/components/booking/FlexibleCancellationAddon";
import { loadBookingSearchDraft } from "@/lib/booking/booking-draft";
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
  const kycApproved = type === "self_drive" ? Boolean(props.kycApproved) : false;
  const tripType = type === "with_driver" ? props.tripType : undefined;
  const router = useRouter();
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
  const [mobileOtpVerified, setMobileOtpVerified] = useState(kycApproved);
  const [couponCode, setCouponCode] = useState("");
  const [flexibleCancellation, setFlexibleCancellation] = useState(false);

  const accountLocked = Boolean(customerPrefill?.email || customerPrefill?.mobile);

  useEffect(() => {
    const draft = loadBookingSearchDraft();
    const listingPickupFallback =
      type === "self_drive" ? (listing as SelfDriveResult).owner_city : undefined;

    setCustomerName(firstNonEmpty(customerPrefill?.name));
    setCustomerEmail(firstNonEmpty(customerPrefill?.email));
    setCustomerMobile(firstNonEmpty(customerPrefill?.mobile));
    setPickupLocation(
      firstNonEmpty(draft.pickupLocation, listing.pickup_city, listingPickupFallback)
    );
    setDropLocation(firstNonEmpty(draft.dropLocation, listing.drop_city));
    setPickupDate(firstNonEmpty(draft.pickupDate, listing.journey_date));
    setPickupTime(firstNonEmpty(draft.pickupTime, listing.journey_time));
    setReturnDate(draft.returnDate);
    setReturnTime(draft.returnTime);
    if (kycApproved) setMobileOtpVerified(true);
    setDraftLoaded(true);
  }, [customerPrefill, listing, type, kycApproved]);

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

  const driverPricing = useMemo(
    () =>
      !isSelfDrive
        ? calculateAiPricing({
            distanceKm: distanceKm || 100,
            tripType: pricingTripType,
            vehicleType: listing.vehicle_type,
            fuelType: (listing as DriverVehicleResult).fuel_type,
            driverRequired: true,
            ratePerKm: (listing as DriverVehicleResult).rate_per_km,
          })
        : null,
    [distanceKm, isSelfDrive, listing, pricingTripType]
  );

  const totalFare = isSelfDrive ? selfDrivePricing!.payableAmount : driverPricing!.finalFare;
  const protectionFee = isSelfDrive ? getProtectionFeeForVehicle(listing.vehicle_type) : 0;
  const payAmount =
    isSelfDrive && selfDrivePricing
      ? calculateSelfDriveCheckoutAmount(selfDrivePricing, paymentType) +
        (flexibleCancellation ? protectionFee : 0)
      : getAdvancePaymentAmount(totalFare, paymentType);

  const policyBookingType = isSelfDrive ? "self_drive" : "with_driver";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!kycApproved && !mobileOtpVerified) {
      setError("Please verify your mobile number with OTP before continuing.");
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
      base_fare: isSelfDrive ? selfDrivePricing!.vehicleRentTotal : driverPricing!.baseFare,
      platform_fee: isSelfDrive ? selfDrivePricing!.platformFee : driverPricing!.platformFee,
      discount_amount: isSelfDrive ? 0 : driverPricing!.discountAmount,
      trip_fare_amount: totalFare,
      security_deposit_amount: isSelfDrive ? selfDrivePricing!.deposit.amount : 0,
      flexible_cancellation: isSelfDrive ? flexibleCancellation : false,
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
              <p className="text-sm text-white/60">Total fare: {formatINR(totalFare)}</p>
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
      <CancellationPolicyCard bookingType={policyBookingType} tripType={tripType} />
      <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl bg-secondary text-white p-6 space-y-4 h-fit">
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
          {isSelfDrive && selfDrivePricing ? (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/60">Booking Summary</p>
              <SelfDriveFareSummary
                pricing={selfDrivePricing}
                paymentType="full"
                protectionSelected={flexibleCancellation}
                protectionFee={protectionFee}
              />
            </>
          ) : driverPricing ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span>{formatINR(driverPricing.baseFare)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>{formatINR(driverPricing.platformFee)}</span>
              </div>
              {driverPricing.discountAmount > 0 && (
                <div className="flex justify-between text-green-300">
                  <span>Discount</span>
                  <span>-{formatINR(driverPricing.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-accent text-lg pt-2">
                <span>Final Fare</span>
                <span>{formatINR(totalFare)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-bold text-secondary">Booking Details</h2>
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
          readOnly={accountLocked && Boolean(customerMobile)}
          onChange={(e) => {
            if (accountLocked && customerPrefill?.mobile) return;
            setCustomerMobile(e.target.value);
            if (!kycApproved) setMobileOtpVerified(false);
          }}
        />
        {kycApproved ? (
          <KycVerifiedNotice />
        ) : (
          <BookingOtpVerification mobile={customerMobile} onVerified={() => setMobileOtpVerified(true)} />
        )}
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
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Trip Type</span>
              <select name="trip_type" defaultValue={tripType ?? "One Way"} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm">
                <option>One Way</option>
                <option>Round Trip</option>
                <option>Multi-City</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="driver_required" defaultChecked className="h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">Driver Required</span>
            </label>
          </>
        )}
        <FormField label="Special Instructions" name="special_instructions" as="textarea" placeholder="Any special requests..." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Coupon Code</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="WELCOME100"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase"
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
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || (!kycApproved && !mobileOtpVerified)}>
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
