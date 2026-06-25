import { XCircle } from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import { getCancellationReasonLabel } from "@/lib/services/cancellation-reasons";
import { isRiderPaymentCompleted } from "@/lib/bookings/my-bookings-utils";
import type { BookingConfirmation } from "@/types/database";

interface Props {
  booking: BookingConfirmation & {
    cancelled_by_role?: string | null;
    cancellation_reason_category?: string | null;
  };
}

function formatRefundStatusLabel(
  paymentCompleted: boolean,
  refundStatus?: string | null
): string {
  const key = String(refundStatus ?? "").toLowerCase();
  if (!paymentCompleted || key === "not_required") return "No Payment Received";
  if (key === "refunded") return "Refunded";
  if (key === "pending" || key === "processing" || key === "approved") return "Refund Pending";
  if (key === "rejected") return "Not Eligible";
  return refundStatus?.replace(/_/g, " ") ?? "—";
}

export default function CancellationDetailsCard({ booking }: Props) {
  const paymentCompleted = isRiderPaymentCompleted(booking.payment_status);
  const cancelledBy =
    booking.cancelled_by_role === "admin"
      ? "Admin"
      : booking.cancelled_by_role === "owner"
        ? "Owner"
        : "Rider";

  const reason =
    booking.cancellation_reason ??
    (booking.cancellation_reason_category
      ? getCancellationReasonLabel(booking.cancellation_reason_category)
      : "—");

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <XCircle className="h-5 w-5 text-red-600" />
        <h2 className="text-lg font-bold text-secondary">Cancellation Details</h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-gray-500">Cancelled By</dt>
          <dd className="font-semibold text-secondary mt-0.5">{cancelledBy}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Cancelled On</dt>
          <dd className="font-semibold text-secondary mt-0.5">
            {booking.cancelled_at ? formatDate(booking.cancelled_at) : "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-gray-500">Reason</dt>
          <dd className="font-medium text-secondary mt-0.5">{reason}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Cancellation Charges</dt>
          <dd className="font-semibold text-red-600 tabular-nums mt-0.5">
            {formatINR(booking.cancellation_charges ?? 0)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Refund Amount</dt>
          <dd className="font-semibold text-emerald-700 tabular-nums mt-0.5">
            {formatINR(paymentCompleted ? (booking.refund_amount ?? 0) : 0)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Refund Status</dt>
          <dd className="font-semibold text-secondary mt-0.5">
            {formatRefundStatusLabel(paymentCompleted, booking.refund_status)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
