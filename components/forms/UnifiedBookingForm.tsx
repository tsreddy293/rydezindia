"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import { calculateAiPricing, getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import {
  calculateSelfDrivePricing,
  resolveSelfDriveDailyRent,
} from "@/lib/pricing/self-drive-pricing";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";
import { formatINR } from "@/lib/utils";
import BookingOtpVerification from "@/components/booking/BookingOtpVerification";
import type { DriverVehicleResult, SelfDriveResult } from "@/types/database";

type Props =
  | {
      type: "self_drive";
      listing: SelfDriveResult;
      distanceKm?: number;
    }
  | {
      type: "with_driver";
      listing: DriverVehicleResult;
      distanceKm?: number;
      tripType?: string;
    };

export default function UnifiedBookingForm(props: Props) {
  const { type, listing, distanceKm = 0 } = props;
  const tripType = type === "with_driver" ? props.tripType : undefined;
  const router = useRouter();
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [paymentType, setPaymentType] = useState<"advance" | "full">("advance");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const isSelfDrive = type === "self_drive";
  const pricingTripType = mapDriverTripTypeLabel(tripType) ?? "one_way";

  const selfDriveListing = isSelfDrive ? (listing as SelfDriveResult) : null;
  const selfDrivePricing = isSelfDrive
    ? calculateSelfDrivePricing(
        resolveSelfDriveDailyRent(selfDriveListing!),
        selfDriveListing!.security_deposit ?? 0
      )
    : null;

  const driverPricing = !isSelfDrive
    ? calculateAiPricing({
        distanceKm: distanceKm || 100,
        tripType: pricingTripType,
        vehicleType: listing.vehicle_type,
        fuelType: (listing as DriverVehicleResult).fuel_type,
        driverRequired: true,
        ratePerKm: (listing as DriverVehicleResult).rate_per_km,
      })
    : null;

  const totalFare = isSelfDrive
    ? selfDrivePricing!.payableAmount
    : driverPricing!.finalFare;

  const payAmount = getAdvancePaymentAmount(totalFare, paymentType);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mobileOtpVerified) {
      setError("Please verify your mobile number with OTP before continuing.");
      return;
    }
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const name = String(form.get("passenger_name") ?? "");
    const mobile = String(form.get("mobile") ?? "");

    setCustomerName(name);
    setCustomerMobile(mobile);

    const result = await createUnifiedBooking({
      booking_type: type,
      reference_id: listing.id,
      vehicle_id: listing.vehicle_id,
      owner_id: (listing as DriverVehicleResult).owner_id ?? (listing as SelfDriveResult).owner_id,
      passenger_name: name,
      mobile,
      amount: totalFare,
      pickup_location: String(form.get("pickup_location") ?? listing.pickup_city),
      drop_location: String(form.get("drop_location") ?? listing.drop_city ?? ""),
      pickup_date: String(form.get("pickup_date") ?? listing.journey_date ?? ""),
      pickup_time: String(form.get("pickup_time") ?? listing.journey_time ?? ""),
      trip_type: String(form.get("trip_type") ?? tripType ?? "One Way"),
      driver_required: form.get("driver_required") === "on" || !isSelfDrive,
      special_instructions: String(form.get("special_instructions") ?? ""),
      base_fare: isSelfDrive ? selfDrivePricing!.dailyRent : driverPricing!.baseFare,
      platform_fee: isSelfDrive ? selfDrivePricing!.platformFee : driverPricing!.platformFee,
      discount_amount: isSelfDrive ? 0 : driverPricing!.discountAmount,
      coupon_code: couponCode.trim() || undefined,
      wallet_amount_used: Number(form.get("wallet_amount") ?? 0) || undefined,
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
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-secondary text-white p-6">
          <h2 className="text-xl font-bold mb-4">Payment Options</h2>
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
          <p className="mt-4 text-sm text-white/60">Total fare: {formatINR(totalFare)}</p>
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
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl bg-secondary text-white p-6 space-y-4 h-fit">
        <h2 className="text-xl font-bold">{listing.vehicle_name}</h2>
        <p className="text-white/70 text-sm">{listing.vehicle_type}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {listing.drop_city ? `${listing.pickup_city} → ${listing.drop_city}` : listing.pickup_city}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Owner: {listing.owner_name}
          </div>
        </div>
        <div className="border-t border-white/20 pt-4 space-y-1 text-sm">
          {isSelfDrive && selfDrivePricing ? (
            <>
              <div className="flex justify-between">
                <span>Daily Rent</span>
                <span>{formatINR(selfDrivePricing.dailyRent)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>{formatINR(selfDrivePricing.platformFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>{formatINR(selfDrivePricing.gst)}</span>
              </div>
              <div className="flex justify-between font-bold text-accent text-lg pt-2">
                <span>Payable Amount</span>
                <span>{formatINR(selfDrivePricing.payableAmount)}</span>
              </div>
              {selfDrivePricing.securityDeposit > 0 && (
                <div className="flex justify-between text-white/70 pt-2 border-t border-white/10 mt-2">
                  <span>Security Deposit (refundable)</span>
                  <span>{formatINR(selfDrivePricing.securityDeposit)}</span>
                </div>
              )}
            </>
          ) : driverPricing ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-bold text-secondary">Booking Details</h2>
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        <FormField label="Customer Name" name="passenger_name" required placeholder="Your full name" />
        <FormField
          label="Mobile Number"
          name="mobile"
          type="tel"
          required
          placeholder="9876543210"
          value={customerMobile}
          onChange={(e) => {
            setCustomerMobile(e.target.value);
            setMobileOtpVerified(false);
          }}
        />
        <BookingOtpVerification
          mobile={customerMobile}
          onVerified={() => setMobileOtpVerified(true)}
        />
        <FormField label="Pickup Location" name="pickup_location" defaultValue={listing.pickup_city} required />
        <FormField label="Drop Location" name="drop_location" defaultValue={listing.drop_city} />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Pickup Date" name="pickup_date" type="date" defaultValue={listing.journey_date} required />
          <FormField label="Pickup Time" name="pickup_time" type="time" defaultValue={listing.journey_time} />
        </div>
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
          <FormField
            label="Use Wallet (₹)"
            name="wallet_amount"
            type="number"
            placeholder="0"
          />
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !mobileOtpVerified}>
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating booking...</> : "Continue to Payment"}
        </Button>
      </form>
    </div>
  );
}
