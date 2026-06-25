"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cancelBookingByCustomer, getRefundEstimateAction } from "@/server/actions/bookingCancellation";
import { REFUND_PROCESSING_ESTIMATE } from "@/lib/services/cancellation-policy";
import {
  CANCELLATION_REASON_OPTIONS,
  type CancellationReasonCategory,
} from "@/lib/services/cancellation-reasons";
import { canCustomerCancelBooking } from "@/lib/bookings/my-bookings-utils";
import { formatINR } from "@/lib/utils";
import type { RefundCalculationResult } from "@/lib/services/cancellation-policy";

interface Props {
  bookingId: string;
  bookingStatus: string;
  cancellationStatus?: string | null;
  pickupDate?: string;
  pickupTime?: string;
  onCancelled?: () => void;
}

export default function CancelBookingButton({
  bookingId,
  bookingStatus,
  cancellationStatus,
  pickupDate,
  pickupTime,
  onCancelled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<CancellationReasonCategory | "">("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [estimate, setEstimate] = useState<RefundCalculationResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const canCancel = canCustomerCancelBooking({
    bookingStatus,
    cancellationStatus,
    pickupDate,
    pickupTime,
  });

  if (!canCancel) return null;

  async function openDialog() {
    setError("");
    setOpen(true);
    const result = await getRefundEstimateAction(bookingId);
    if (result.success && result.data) {
      setEstimate(result.data);
    } else if (!result.success) {
      setError(result.error ?? "Unable to load refund estimate");
    }
  }

  function handleCancel() {
    if (!reasonCategory) {
      setError("Please select a cancellation reason.");
      return;
    }
    if (reasonCategory === "other" && !reasonDetails.trim()) {
      setError("Please describe your reason for cancelling.");
      return;
    }

    startTransition(async () => {
      setError("");
      const result = await cancelBookingByCustomer({
        bookingId,
        reasonCategory,
        reasonDetails: reasonDetails.trim() || undefined,
      });
      if (result.success) {
        setOpen(false);
        onCancelled?.();
      } else {
        setError(result.error ?? "Cancellation failed");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openDialog}
        className="border-red-200 text-red-600 hover:bg-red-50"
      >
        <XCircle className="h-4 w-4 mr-1.5" />
        Cancel Booking
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-[fadeUp_0.25s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 id="cancel-title" className="text-lg font-bold text-secondary">
                  Cancel this booking?
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Refunds follow our cancellation policy based on time before pickup.
                </p>
              </div>
            </div>

            {estimate && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-2.5">
                <p className="text-xs font-medium text-gray-500">{estimate.policyTier}</p>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Booking Amount</span>
                  <span className="font-semibold tabular-nums text-secondary">
                    {formatINR(estimate.bookingAmount)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Cancellation Charges</span>
                  <span className="font-semibold tabular-nums text-red-600">
                    {formatINR(estimate.cancellationCharges)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-2.5">
                  <span className="font-medium text-gray-800">Refund Amount</span>
                  <span className="font-bold tabular-nums text-emerald-700">
                    {formatINR(estimate.totalRefundAmount)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 pt-0.5">{REFUND_PROCESSING_ESTIMATE}</p>
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-secondary">
              Reason for cancellation
              <select
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as CancellationReasonCategory | "")}
              >
                <option value="">Select a reason</option>
                {CANCELLATION_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {reasonCategory === "other" && (
              <label className="mt-3 block text-sm font-medium text-secondary">
                Please specify
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  placeholder="Tell us more about your reason..."
                />
              </label>
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Keep Booking
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCancel}
                disabled={pending}
                className="bg-red-600 hover:bg-red-700"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Cancelling...
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
