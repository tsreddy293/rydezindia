"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import SelfDrivePaymentWorkflowSummary from "@/components/booking/SelfDrivePaymentWorkflowSummary";
import SelfDrivePaymentProgressCard from "@/components/booking/SelfDrivePaymentProgressCard";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import {
  getSelfDrivePaymentPhase,
  selfDrivePayAmount,
  type SelfDrivePaymentPhase,
} from "@/lib/bookings/self-drive-payment-ui";
import type { SelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";
import { calculateSelfDrivePaymentWorkflow } from "@/lib/pricing/self-drive-payment-workflow";
import { InclusiveFareNotes, InclusiveTripFareRow } from "@/components/booking/InclusiveFareDisplay";
import { formatINR } from "@/lib/utils";

interface Props {
  bookingId: string;
  totalFare: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  /** When true, only full payment is offered (return journey). */
  fullPaymentOnly?: boolean;
  selfDrive?: {
    bookingStatus: string;
    paymentStatus: string;
    snapshot: SelfDrivePaymentSnapshot;
    pickupDate?: string;
    bookingAmount?: number;
  };
  onPaid: () => void;
  onSkip?: () => void;
  skipLabel?: string;
}

export default function BookingPendingPayment({
  bookingId,
  totalFare,
  customerName,
  customerMobile,
  customerEmail,
  fullPaymentOnly = false,
  selfDrive,
  onPaid,
  onSkip,
  skipLabel = "Skip payment for now",
}: Props) {
  const [paymentType, setPaymentType] = useState<"advance" | "full">(
    fullPaymentOnly ? "full" : "advance"
  );
  const [error, setError] = useState("");

  const selfDrivePhase: SelfDrivePaymentPhase | null = selfDrive
    ? getSelfDrivePaymentPhase(
        { payment_status: selfDrive.paymentStatus },
        selfDrive.snapshot
      )
    : null;

  const workflow =
    selfDrive && selfDrivePhase === "initial"
      ? calculateSelfDrivePaymentWorkflow({
          tripFare: selfDrive.snapshot.tripFare,
          securityDeposit: selfDrive.snapshot.securityDeposit,
        })
      : null;

  const payAmount = selfDrive && selfDrivePhase
    ? selfDrivePayAmount(selfDrivePhase, selfDrive.snapshot, selfDrive.bookingAmount)
    : getAdvancePaymentAmount(totalFare, paymentType);

  const paymentPhase =
    selfDrivePhase === "balance"
      ? "self_drive_balance"
      : selfDrivePhase === "initial"
        ? "self_drive_initial"
        : undefined;

  if (selfDrive && selfDrivePhase === "balance") {
    return (
      <div className="space-y-6">
        <SelfDrivePaymentProgressCard
          bookingStatus={selfDrive.bookingStatus}
          paymentStatus={selfDrive.paymentStatus}
          snapshot={selfDrive.snapshot}
          pickupDate={selfDrive.pickupDate}
        />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
            <h2 className="text-xl font-bold">Pay Remaining Balance</h2>
            <p className="text-sm text-white/70">
              Balance payment must be completed before vehicle pickup.
            </p>
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm text-white/80">Remaining Balance (70%)</p>
              <p className="text-2xl font-bold text-accent tabular-nums">
                {formatINR(selfDrive.snapshot.amountDue)}
              </p>
            </div>
            <p className="text-xs text-white/60">
              Security deposit of {formatINR(selfDrive.snapshot.securityDeposit)} was collected at booking and is held until trip completion.
            </p>
          </div>
          <div className="space-y-4">
            <RazorpayCheckout
              bookingId={bookingId}
              amount={payAmount}
              customerName={customerName}
              customerMobile={customerMobile}
              customerEmail={customerEmail}
              paymentType="full"
              paymentPhase={paymentPhase}
              amountLabel="Remaining Balance"
              onSuccess={() => onPaid()}
              onError={(msg) => setError(msg)}
            />
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
        {onSkip && (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onSkip}>
            {skipLabel}
          </Button>
        )}
      </div>
    );
  }

  if (selfDrive && selfDrivePhase === "initial" && workflow) {
    return (
      <div className="space-y-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
            <h2 className="text-xl font-bold">Pay to Confirm Booking</h2>
            <p className="text-sm text-white/70">
              30% trip advance + 100% refundable security deposit due now.
            </p>
            <SelfDrivePaymentWorkflowSummary workflow={workflow} showBalancePreview={false} />
          </div>
          <div className="space-y-4">
            <RazorpayCheckout
              bookingId={bookingId}
              amount={payAmount}
              customerName={customerName}
              customerMobile={customerMobile}
              customerEmail={customerEmail}
              paymentType="advance"
              paymentPhase={paymentPhase}
              amountLabel="Amount Payable Now"
              onSuccess={() => onPaid()}
              onError={(msg) => setError(msg)}
            />
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
          <h2 className="text-xl font-bold">Complete Payment</h2>
          <InclusiveTripFareRow amount={totalFare} variant="dark" showNotes={false} />
          <InclusiveFareNotes variant="dark" />
          {!fullPaymentOnly && (
            <div className="space-y-3 border-t border-white/15 pt-4">
              <label className="flex items-center gap-3 rounded-xl bg-white/10 p-4 cursor-pointer">
                <input
                  type="radio"
                  name="pay_type"
                  checked={paymentType === "advance"}
                  onChange={() => setPaymentType("advance")}
                />
                <div>
                  <p className="font-medium">Advance Payment (30%)</p>
                  <p className="text-sm text-white/70">
                    {formatINR(getAdvancePaymentAmount(totalFare, "advance"))}
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
                  <p className="text-sm text-white/70">{formatINR(totalFare)}</p>
                </div>
              </label>
            </div>
          )}
          {fullPaymentOnly && (
            <p className="text-lg font-bold text-accent">{formatINR(totalFare)} due now</p>
          )}
        </div>

        <div className="space-y-4">
          <RazorpayCheckout
            bookingId={bookingId}
            amount={payAmount}
            customerName={customerName}
            customerMobile={customerMobile}
            customerEmail={customerEmail}
            paymentType={paymentType}
            onSuccess={() => onPaid()}
            onError={(msg) => setError(msg)}
          />
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>

      {onSkip && (
        <Button variant="outline" className="w-full sm:w-auto" onClick={onSkip}>
          {skipLabel}
        </Button>
      )}
    </div>
  );
}

export function BookingPaymentLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-10 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      Loading payment...
    </div>
  );
}
