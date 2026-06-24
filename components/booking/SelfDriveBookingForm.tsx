"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Shield, User } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import KycVerifiedNotice from "@/components/booking/KycVerifiedNotice";
import SelfDriveFareSummary from "@/components/booking/SelfDriveFareSummary";
import CancellationPolicyAccordion from "@/components/booking/CancellationPolicyAccordion";
import FlexibleCancellationAddon from "@/components/booking/FlexibleCancellationAddon";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import {
  calculateSelfDriveCheckoutAmount,
  calculateSelfDrivePricingForSchedule,
  resolveSelfDriveDailyRent,
  resolveSelfDriveDepositInfo,
} from "@/lib/pricing/self-drive-pricing";
import { getProtectionFeeForVehicle } from "@/lib/services/flexible-cancellation-protection";
import { formatINR } from "@/lib/utils";
import { loadBookingSearchDraft, saveBookingSearchDraft } from "@/lib/booking/booking-draft";
import type { RiderBookingProfile } from "@/lib/users/rider-profile";
import type { SelfDriveResult } from "@/types/database";

export interface SelfDriveSearchPrefill {
  pickupCity?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
}

interface Props {
  listing: SelfDriveResult;
  customer: RiderBookingProfile;
  searchPrefill?: SelfDriveSearchPrefill;
}

function buildReturnScheduleNote(returnDate: string, returnTime: string): string {
  const parts: string[] = [];
  if (returnDate) parts.push(`Return date: ${returnDate}`);
  if (returnTime) parts.push(`Return time: ${returnTime}`);
  return parts.join(" · ");
}

export default function SelfDriveBookingForm({ listing, customer, searchPrefill }: Props) {
  const router = useRouter();
  const policyCheckboxId = useId();
  const [step, setStep] = useState<"form" | "payment" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [paymentType, setPaymentType] = useState<"advance" | "full">("advance");
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [pickupCity, setPickupCity] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [travelPlan, setTravelPlan] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [flexibleCancellation, setFlexibleCancellation] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);

  const pricing = useMemo(
    () =>
      calculateSelfDrivePricingForSchedule(
        resolveSelfDriveDailyRent(listing),
        resolveSelfDriveDepositInfo(listing),
        { pickupDate, pickupTime, returnDate, returnTime }
      ),
    [listing, pickupDate, pickupTime, returnDate, returnTime]
  );

  const totalFare = pricing.payableAmount;
  const protectionFee = getProtectionFeeForVehicle(listing.vehicle_type);
  const payAmount =
    calculateSelfDriveCheckoutAmount(pricing, paymentType) +
    (flexibleCancellation ? protectionFee : 0);

  useEffect(() => {
    const draft = loadBookingSearchDraft();
    const pickup =
      searchPrefill?.pickupCity ||
      draft.pickupLocation ||
      listing.pickup_city ||
      listing.owner_city ||
      "";
    const pDate = searchPrefill?.pickupDate || draft.pickupDate || listing.journey_date || "";
    const pTime = searchPrefill?.pickupTime || draft.pickupTime || listing.journey_time || "";
    const rDate = searchPrefill?.returnDate || draft.returnDate || "";
    const rTime = searchPrefill?.returnTime || draft.returnTime || "";

    setPickupCity(pickup);
    setPickupDate(pDate);
    setPickupTime(pTime);
    setReturnDate(rDate);
    setReturnTime(rTime);

    saveBookingSearchDraft({
      pickupLocation: pickup,
      pickupDate: pDate,
      pickupTime: pTime,
      returnDate: rDate,
      returnTime: rTime,
      serviceType: "self_drive",
    });

    setDraftLoaded(true);
  }, [listing, searchPrefill]);

  useEffect(() => {
    if (!draftLoaded) return;
    saveBookingSearchDraft({
      pickupLocation: pickupCity,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      serviceType: "self_drive",
    });
  }, [draftLoaded, pickupCity, pickupDate, pickupTime, returnDate, returnTime]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer.name.trim() || !customer.mobile.trim()) {
      setError("Your account profile is missing name or mobile. Update your profile and try again.");
      return;
    }
    if (!pickupCity.trim()) {
      setError("Pickup city is required.");
      return;
    }
    if (!pickupDate) {
      setError("Pickup date is required.");
      return;
    }
    if (returnDate && returnDate < pickupDate) {
      setError("Return date must be on or after pickup date.");
      return;
    }
    if (!policyAgreed) {
      setError("Please read and agree to the Cancellation Policy before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    const returnNote = buildReturnScheduleNote(returnDate, returnTime);
    const instructions = [travelPlan.trim(), returnNote].filter(Boolean).join("\n\n");

    const result = await createUnifiedBooking({
      booking_type: "self_drive",
      reference_id: listing.id,
      vehicle_id: listing.vehicle_id,
      owner_id: listing.owner_id,
      passenger_name: customer.name,
      mobile: customer.mobile,
      amount: totalFare,
      pickup_location: pickupCity,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      trip_type: "Self Drive",
      driver_required: false,
      special_instructions: instructions || undefined,
      base_fare: pricing.vehicleRentTotal,
      platform_fee: pricing.platformFee,
      trip_fare_amount: totalFare,
      security_deposit_amount: pricing.deposit.amount,
      flexible_cancellation: flexibleCancellation,
      protection_selected: flexibleCancellation,
      protection_fee: flexibleCancellation ? protectionFee : 0,
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
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
          <h2 className="text-xl font-bold">Payment Options</h2>
          <SelfDriveFareSummary
            pricing={pricing}
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
                  {formatINR(calculateSelfDriveCheckoutAmount(pricing, "advance"))}
                  {pricing.deposit.collectedAtPickup ? " · deposit at pickup" : " incl. deposit"}
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
                  {formatINR(calculateSelfDriveCheckoutAmount(pricing, "full"))}
                  {pricing.deposit.collectedAtPickup ? " · deposit at pickup" : " incl. deposit"}
                </p>
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
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            {pickupCity || listing.pickup_city || listing.owner_city || "Pickup city"}
          </div>
          {(pickupDate || pickupTime) && (
            <p className="text-white/80 pl-6">
              Pickup: {pickupDate || "—"}
              {pickupTime ? ` at ${pickupTime}` : ""}
            </p>
          )}
          {(returnDate || returnTime) && (
            <p className="text-white/80 pl-6">
              Return: {returnDate || "—"}
              {returnTime ? ` at ${returnTime}` : ""}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent shrink-0" />
            Owner: {listing.owner_name}
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/60">Booking Summary</p>
          <SelfDriveFareSummary
            pricing={pricing}
            paymentType="full"
            protectionSelected={flexibleCancellation}
            protectionFee={protectionFee}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-bold text-secondary">Confirm Your Self Drive Booking</h2>
        <p className="text-sm text-gray-500">
          Trip details from your search are pre-filled below. Edit dates or times if needed.
        </p>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-2">
          <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-secondary">{customer.name}</p>
            <p>{customer.mobile}{customer.email ? ` · ${customer.email}` : ""}</p>
          </div>
        </div>

        <KycVerifiedNotice />

        <FormField
          label="Pickup City"
          name="pickup_city"
          required
          value={pickupCity}
          onChange={(e) => setPickupCity(e.target.value)}
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

        <FormField
          label="Travel Plan / Tour Program"
          name="travel_plan"
          as="textarea"
          placeholder="Describe your route, cities, or tour program..."
          value={travelPlan}
          onChange={(e) => setTravelPlan(e.target.value)}
          rows={4}
        />

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

        <FlexibleCancellationAddon
          vehicleType={listing.vehicle_type}
          checked={flexibleCancellation}
          onChange={setFlexibleCancellation}
        />

        <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">
          By proceeding to payment, you agree to Rydez India Cancellation &amp; Refund Policy.
        </p>
        <label
          htmlFor={policyCheckboxId}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3"
        >
          <input
            id={policyCheckboxId}
            type="checkbox"
            checked={policyAgreed}
            onChange={(e) => setPolicyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the Cancellation Policy.
          </span>
        </label>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !policyAgreed}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Creating booking...
            </>
          ) : (
            "Continue to Payment"
          )}
        </Button>

        <CancellationPolicyAccordion bookingType="self_drive" />
      </form>
    </div>
  );
}
