"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cancelBookingByCustomer, getRefundEstimateAction } from "@/server/actions/bookingCancellation";
import {
  CANCELLATION_REASON_OPTIONS,
  type CancellationReasonCategory,
} from "@/lib/services/cancellation-reasons";
import { formatRiderPaymentBadgeLabel, formatScheduleLine } from "@/lib/bookings/my-bookings-utils";
import { formatINR } from "@/lib/utils";
import type { RefundCalculationResult } from "@/lib/services/cancellation-policy";
import type { MyBookingRecord } from "@/types/database";

interface Props {
  booking: MyBookingRecord;
  onCancelled?: (message?: string, bookingId?: string) => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-600 shrink-0">{label}</span>
      <span className="font-semibold text-secondary text-right">{value}</span>
    </div>
  );
}

export default function CancelBookingButton({ booking, onCancelled }: Props) {
  const bookingId = booking.id;
  const displayId = booking.booking_reference ?? booking.id.slice(0, 8).toUpperCase();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<CancellationReasonCategory | "">("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [estimate, setEstimate] = useState<{
    paymentCompleted: boolean;
    refund: RefundCalculationResult;
  } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeDialog() {
    if (pending) return;
    setOpen(false);
  }

  async function openDialog() {
    setError("");
    setOpen(true);
    const result = await getRefundEstimateAction(bookingId);
    if (result.success && result.data) {
      setEstimate({
        paymentCompleted: result.data.paymentCompleted,
        refund: result.data.refund,
      });
    } else if (!result.success) {
      setError(result.error ?? "Unable to load cancellation summary");
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
        onCancelled?.("✓ Booking cancelled successfully.", bookingId);
      } else {
        setError(result.error ?? "Cancellation failed");
      }
    });
  }

  const paymentLabel = formatRiderPaymentBadgeLabel({
    bookingStatus: booking.booking_status,
    paymentStatus: booking.payment_status,
    cancellationStatus: booking.cancellation_status,
  });

  const charges = estimate?.refund.cancellationCharges ?? 0;
  const refundAmount = estimate?.paymentCompleted ? (estimate.refund.totalRefundAmount ?? 0) : 0;
  const refundLabel = estimate?.paymentCompleted
    ? formatINR(refundAmount)
    : "₹0 — No Payment Received";

  const dialog =
    open && mounted ? (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 overscroll-contain"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
        onClick={closeDialog}
        role="presentation"
        aria-hidden={false}
      >
        <div
          className="flex w-[95%] max-w-[620px] max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[fadeUp_0.25s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 id="cancel-title" className="text-xl font-bold text-secondary">
                  Cancel this booking?
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Are you sure you want to cancel this booking?
                </p>
                <p className="mt-0.5 text-sm font-medium text-red-600/90">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Cancellation Summary
              </p>
              <SummaryRow label="Booking ID" value={`#${displayId}`} />
              <SummaryRow label="Vehicle Name" value={booking.vehicle_name ?? "Vehicle"} />
              <SummaryRow
                label="Pickup Date"
                value={formatScheduleLine(booking.pickup_date, booking.pickup_time)}
              />
              <SummaryRow
                label="Return Date"
                value={formatScheduleLine(booking.return_date, booking.return_time)}
              />
              <SummaryRow label="Payment Status" value={paymentLabel} />
              <SummaryRow label="Cancellation Charges" value={formatINR(charges)} />
              <div className="flex justify-between gap-3 border-t border-gray-200 pt-2.5 text-sm">
                <span className="font-medium text-gray-800">Estimated Refund</span>
                <span className="font-bold text-emerald-700 tabular-nums">{refundLabel}</span>
              </div>
            </div>

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

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-gray-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={pending}
                className="shrink-0"
              >
                Keep Booking
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCancel}
                disabled={pending}
                className="shrink-0 bg-red-600 hover:bg-red-700 border-red-600"
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
      </div>
    ) : null;

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

      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
