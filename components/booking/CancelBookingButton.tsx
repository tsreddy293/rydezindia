"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cancelBookingByCustomer, getRefundEstimateAction } from "@/server/actions/bookingCancellation";
import { REFUND_PROCESSING_ESTIMATE } from "@/lib/services/cancellation-policy";
import { formatINR } from "@/lib/utils";
import type { RefundCalculationResult } from "@/lib/services/cancellation-policy";

interface Props {
  bookingId: string;
  bookingStatus: string;
  cancellationStatus?: string | null;
  canCancel?: boolean;
  onCancelled?: () => void;
}

export default function CancelBookingButton({
  bookingId,
  bookingStatus,
  cancellationStatus,
  canCancel = true,
  onCancelled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [estimate, setEstimate] = useState<RefundCalculationResult | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const isCancelled =
    cancellationStatus === "cancelled" || bookingStatus.toLowerCase() === "cancelled";

  if (isCancelled || !canCancel) return null;

  const activeStatuses = ["pending", "confirmed", "approved", "paid"];
  if (!activeStatuses.includes(bookingStatus.toLowerCase())) return null;

  async function openDialog() {
    setError("");
    setSuccess("");
    setOpen(true);
    const result = await getRefundEstimateAction(bookingId);
    if (result.success && result.data) {
      setEstimate(result.data);
    }
  }

  function handleCancel() {
    if (!reason.trim()) {
      setError("Please tell us why you are cancelling.");
      return;
    }
    startTransition(async () => {
      setError("");
      const result = await cancelBookingByCustomer({ bookingId, reason: reason.trim() });
      if (result.success) {
        setSuccess(`Booking cancelled. Estimated refund: ${formatINR(result.data?.refundAmount ?? 0)}`);
        setOpen(false);
        onCancelled?.();
      } else {
        setError(result.error ?? "Cancellation failed");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog} className="text-red-600 border-red-200 hover:bg-red-50">
        <XCircle className="h-4 w-4 mr-1" />
        Cancel Booking
      </Button>

      {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-secondary">Cancel this booking?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Refunds follow our cancellation policy based on time before pickup.
                </p>
              </div>
            </div>

            {estimate && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm">
                <p className="font-medium text-emerald-900">{estimate.policyTier}</p>
                <p className="mt-2 text-gray-700">
                  Trip fare refund: {formatINR(estimate.tripFareRefundAmount)} ({estimate.tripFareRefundPercent}%)
                </p>
                {estimate.securityDepositRefundAmount > 0 && (
                  <p className="text-gray-700">
                    Deposit refund: {formatINR(estimate.securityDepositRefundAmount)}
                  </p>
                )}
                <p className="mt-2 font-bold text-secondary">
                  Total estimated refund: {formatINR(estimate.totalRefundAmount)}
                </p>
                <p className="mt-2 text-xs text-gray-500">{REFUND_PROCESSING_ESTIMATE}</p>
              </div>
            )}

            <label className="mt-4 block text-sm font-medium text-secondary">
              Reason for cancellation
              <textarea
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Change of plans, found another vehicle, etc."
              />
            </label>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Keep Booking
              </Button>
              <Button type="button" variant="primary" onClick={handleCancel} disabled={pending} className="bg-red-600 hover:bg-red-700">
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
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
