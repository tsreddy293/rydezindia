"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  selfDriveAdvanceCollected,
  selfDriveIsFullyPaid,
  type SelfDrivePaymentSnapshot,
} from "@/lib/bookings/self-drive-payment";
import { formatINR } from "@/lib/utils";

interface Props {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  snapshot: SelfDrivePaymentSnapshot;
  pickupDate?: string;
  compact?: boolean;
}

export default function SelfDriveCustomerPaymentSummary({
  bookingId,
  bookingStatus,
  paymentStatus,
  snapshot,
  pickupDate,
  compact = false,
}: Props) {
  const confirmed = bookingStatus.toLowerCase() === "confirmed";
  const advanceCollected = selfDriveAdvanceCollected(snapshot);
  const fullyPaid = selfDriveIsFullyPaid(paymentStatus, snapshot);
  const balanceDue = fullyPaid ? 0 : snapshot.amountDue;

  if (!advanceCollected && !confirmed) return null;

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50/70 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-bold text-emerald-900">
            {confirmed ? "Booking Confirmed" : "Advance Received"}
          </p>

          <div className={`grid gap-2 ${compact ? "text-xs" : "text-sm sm:grid-cols-2"}`}>
            <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-semibold tabular-nums text-secondary">
                {formatINR(snapshot.amountPaid)}
              </span>
            </div>
            <div className="flex justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
              <span className="text-gray-600">Remaining Balance</span>
              <span
                className={`font-semibold tabular-nums ${
                  balanceDue > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {formatINR(balanceDue)}
              </span>
            </div>
          </div>

          {balanceDue > 0 && (
            <div className="space-y-2">
              <p className="flex items-start gap-1.5 text-xs font-medium text-amber-900">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Pay remaining balance before pickup{pickupDate ? ` on ${pickupDate}` : ""}.
              </p>
              <Link
                href={`/booking/pay/${bookingId}`}
                className="inline-flex rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
              >
                Pay Remaining Balance
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
