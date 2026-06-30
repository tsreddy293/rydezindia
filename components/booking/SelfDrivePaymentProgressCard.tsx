"use client";

import { Check, Clock, Lock, ShieldCheck } from "lucide-react";
import {
  selfDriveBookingStatusLabel,
  selfDriveProgressState,
  selfDriveWorkflowLabel,
  type SelfDrivePaymentSnapshot,
} from "@/lib/bookings/self-drive-payment";
import { formatINR } from "@/lib/utils";

interface Props {
  bookingStatus: string;
  paymentStatus: string;
  snapshot: SelfDrivePaymentSnapshot;
  pickupDate?: string;
  compact?: boolean;
}

export default function SelfDrivePaymentProgressCard({
  bookingStatus,
  paymentStatus,
  snapshot,
  pickupDate,
  compact = false,
}: Props) {
  const progress = selfDriveProgressState(paymentStatus, snapshot);

  const steps = [
    {
      done: progress.advancePaid,
      pending: !progress.advancePaid,
      icon: progress.advancePaid ? Check : Clock,
      label: progress.advancePaid ? "Advance Paid" : "Advance Payment Pending",
      detail: formatINR(snapshot.advanceAmount + snapshot.securityDeposit),
    },
    {
      done: progress.balancePaid,
      pending: progress.advancePaid && !progress.balancePaid,
      icon: progress.balancePaid ? Check : Clock,
      label: progress.balancePaid ? "Balance Paid" : "Balance Payment Pending",
      detail: formatINR(snapshot.amountDue),
    },
    {
      done: progress.depositHeld || progress.depositRefunded,
      pending: progress.balancePaid && progress.depositHeld,
      icon: Lock,
      label: progress.depositRefunded ? "Deposit Refunded" : "Deposit Held",
      detail: formatINR(snapshot.securityDeposit),
    },
    {
      done: progress.depositRefunded,
      pending: false,
      icon: ShieldCheck,
      label: "Expected Refund",
      detail: formatINR(snapshot.depositRefundAmount || snapshot.securityDeposit),
    },
  ];

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-secondary sm:text-base">Payment Progress</h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
            {selfDriveBookingStatusLabel(bookingStatus)}
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {selfDriveWorkflowLabel(paymentStatus, snapshot)}
          </span>
        </div>
      </div>

      <ul className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${
                step.done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : step.pending
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-gray-100 bg-gray-50/50"
              }`}
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  step.done ? "text-emerald-600" : step.pending ? "text-amber-600" : "text-gray-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-secondary">{step.label}</p>
                <p className="text-xs text-gray-500">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {!progress.balancePaid && progress.advancePaid && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Balance payment of {formatINR(snapshot.amountDue)} must be completed before vehicle pickup
          {pickupDate ? ` on ${pickupDate}` : ""}.
        </p>
      )}

      {progress.depositHeld && !progress.depositRefunded && (
        <p className="mt-3 text-xs text-gray-500">
          Refundable deposit {formatINR(snapshot.securityDeposit)} held until post-trip inspection.
        </p>
      )}
    </div>
  );
}
