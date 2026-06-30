"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import SelfDrivePaymentWorkflowSummary from "@/components/booking/SelfDrivePaymentWorkflowSummary";
import SelfDriveTripSummary from "@/components/booking/SelfDriveTripSummary";
import SelfDriveVehicleCard from "@/components/booking/SelfDriveVehicleCard";
import SelfDriveCustomerDetails from "@/components/booking/SelfDriveCustomerDetails";
import { SELF_DRIVE_CHECKOUT_FEATURES } from "@/lib/booking/self-drive-checkout-features";
import {
  calculateSelfDrivePaymentWorkflowFromPricing,
  resolveSelfDriveBookingDeposit,
} from "@/lib/pricing/self-drive-payment-workflow";
import CancellationPolicyAccordion from "@/components/booking/CancellationPolicyAccordion";
import FlexibleCancellationAddon from "@/components/booking/FlexibleCancellationAddon";
import { createUnifiedBooking } from "@/server/actions/createBooking";
import {
  calculateSelfDrivePricingForSchedule,
  resolveSelfDriveDailyRent,
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

function firstNonEmpty(...values: (string | undefined | null)[]): string {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
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
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftHydratedRef = useRef(false);

  const [pickupCity, setPickupCity] = useState(() =>
    firstNonEmpty(searchPrefill?.pickupCity, listing.pickup_city, listing.owner_city)
  );
  const [pickupDate, setPickupDate] = useState(() =>
    firstNonEmpty(searchPrefill?.pickupDate, listing.journey_date)
  );
  const [pickupTime, setPickupTime] = useState(() =>
    firstNonEmpty(searchPrefill?.pickupTime, listing.journey_time)
  );
  const [returnDate, setReturnDate] = useState(() => firstNonEmpty(searchPrefill?.returnDate));
  const [returnTime, setReturnTime] = useState(() => firstNonEmpty(searchPrefill?.returnTime));
  const [travelPlan, setTravelPlan] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [flexibleCancellation, setFlexibleCancellation] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [walletAmount, setWalletAmount] = useState("");

  const pricing = useMemo(
    () =>
      calculateSelfDrivePricingForSchedule(
        resolveSelfDriveDailyRent(listing),
        {
          amount: resolveSelfDriveBookingDeposit(listing),
          min: resolveSelfDriveBookingDeposit(listing),
          max: resolveSelfDriveBookingDeposit(listing),
          displayLabel: "",
          collectedAtPickup: false,
          isExplicit: true,
        },
        { pickupDate, pickupTime, returnDate, returnTime }
      ),
    [listing, pickupDate, pickupTime, returnDate, returnTime]
  );

  const protectionFee = getProtectionFeeForVehicle(listing.vehicle_type);
  const workflow = useMemo(
    () =>
      calculateSelfDrivePaymentWorkflowFromPricing(pricing, flexibleCancellation ? protectionFee : 0, listing),
    [pricing, flexibleCancellation, protectionFee, listing]
  );

  const payAmount = workflow.amountPayableNow;

  const handlePaymentError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  useEffect(() => {
    if (draftHydratedRef.current) return;
    draftHydratedRef.current = true;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const draft = loadBookingSearchDraft();
      const pickup = firstNonEmpty(
        searchPrefill?.pickupCity,
        draft.pickupLocation,
        listing.pickup_city,
        listing.owner_city
      );
      const pDate = firstNonEmpty(searchPrefill?.pickupDate, draft.pickupDate, listing.journey_date);
      const pTime = firstNonEmpty(searchPrefill?.pickupTime, draft.pickupTime, listing.journey_time);
      const rDate = firstNonEmpty(searchPrefill?.returnDate, draft.returnDate);
      const rTime = firstNonEmpty(searchPrefill?.returnTime, draft.returnTime);

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
    });

    return () => {
      cancelled = true;
    };
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
      amount: workflow.tripFare,
      pickup_location: pickupCity,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      trip_type: "Self Drive",
      driver_required: false,
      special_instructions: instructions || undefined,
      base_fare: pricing.discountedVehicleRentTotal,
      platform_fee: pricing.platformFee,
      trip_fare_amount: workflow.tripFare,
      security_deposit_amount: workflow.securityDeposit,
      protection_selected: flexibleCancellation,
      protection_fee: flexibleCancellation ? protectionFee : 0,
      vehicle_type: listing.vehicle_type,
      coupon_code: SELF_DRIVE_CHECKOUT_FEATURES.couponCode ? couponCode.trim() || undefined : undefined,
      wallet_amount_used: SELF_DRIVE_CHECKOUT_FEATURES.walletBalance
        ? Number(walletAmount) || undefined
        : undefined,
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
        <p className="text-sm text-gray-500">
          Owner contact details are available on your confirmation page after payment.
        </p>
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
          <h2 className="text-lg font-bold text-secondary">Pay to Confirm Booking</h2>
          <p className="mt-1 text-xs text-gray-500">
            30% trip advance + refundable security deposit due now.
          </p>
          <div className="mt-4">
            <SelfDrivePaymentWorkflowSummary
              workflow={workflow}
              variant="light"
              layout="checkout"
              payableLabel="Amount Payable Today"
            />
          </div>
        </div>
        <RazorpayCheckout
          bookingId={bookingId}
          amount={payAmount}
          customerName={customer.name}
          customerMobile={customer.mobile}
          paymentType="advance"
          paymentPhase="self_drive_initial"
          amountLabel="Amount Payable Today"
          onSuccess={() => {
            setStep("done");
            router.refresh();
          }}
          onError={handlePaymentError}
        />
        {error && <p className="text-sm text-red-500 lg:col-span-2">{error}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 pb-28 lg:grid-cols-5 lg:gap-8 lg:pb-0"
    >
      <div className="order-2 space-y-4 lg:order-1 lg:col-span-3">
        <SelfDriveVehicleCard listing={listing} />

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <SelfDriveTripSummary
            values={{ pickupCity, pickupDate, pickupTime, returnDate, returnTime, travelPlan }}
            editing={editingTrip}
            onEdit={() => setEditingTrip(true)}
            onCancelEdit={() => setEditingTrip(false)}
            onChange={(key, value) => {
              if (key === "pickupCity") setPickupCity(value);
              if (key === "pickupDate") setPickupDate(value);
              if (key === "pickupTime") setPickupTime(value);
              if (key === "returnDate") setReturnDate(value);
              if (key === "returnTime") setReturnTime(value);
              if (key === "travelPlan") setTravelPlan(value);
            }}
          />

          <div className="mt-4">
            <SelfDriveCustomerDetails
              name={customer.name}
              mobile={customer.mobile}
              email={customer.email}
            />
          </div>
        </div>
      </div>

      <aside className="order-1 lg:order-2 lg:col-span-2 lg:sticky lg:top-20 lg:z-10 lg:self-start">
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6">
          <h2 className="text-lg font-bold text-secondary">Payment Summary</h2>

          <SelfDrivePaymentWorkflowSummary
            workflow={workflow}
            variant="light"
            layout="checkout"
            payableLabel="Amount Payable Today"
          />

          <FlexibleCancellationAddon
            vehicleType={listing.vehicle_type}
            checked={flexibleCancellation}
            onChange={setFlexibleCancellation}
            variant="compact"
          />

          <CancellationPolicyAccordion bookingType="self_drive" />

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
              <p className="text-center text-[11px] text-gray-400">
                Accept terms to continue
              </p>
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
              Amount Payable Today
            </p>
            <p className="text-xl font-bold tabular-nums text-primary">
              {formatINR(workflow.amountPayableNow)}
            </p>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 px-6"
            disabled={loading || !policyAgreed}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Continue to Payment"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
