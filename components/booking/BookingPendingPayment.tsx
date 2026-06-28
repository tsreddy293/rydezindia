"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import { formatINR } from "@/lib/utils";

interface Props {
  bookingId: string;
  totalFare: number;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  /** When true, only full payment is offered (return journey). */
  fullPaymentOnly?: boolean;
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
  onPaid,
  onSkip,
  skipLabel = "Skip payment for now",
}: Props) {
  const [paymentType, setPaymentType] = useState<"advance" | "full">(
    fullPaymentOnly ? "full" : "advance"
  );
  const [error, setError] = useState("");

  const payAmount = getAdvancePaymentAmount(totalFare, paymentType);

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl bg-secondary text-white p-6 space-y-4">
          <h2 className="text-xl font-bold">Complete Payment</h2>
          <p className="text-sm text-white/70">
            Booking total: {formatINR(totalFare)}
          </p>
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
