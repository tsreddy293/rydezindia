"use client";

import { Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  bookingStatus: string;
  paymentStatus?: string;
  cancelledByRole?: string | null;
  refundStatus?: string | null;
  createdAt?: string;
  cancelledAt?: string | null;
  className?: string;
}

type StepKey = "created" | "cancelled" | "owner" | "trip_started" | "trip_completed";

const CANCELLED_STEPS: { key: StepKey; label: string }[] = [
  { key: "created", label: "Booking Created" },
  { key: "cancelled", label: "Cancelled by Rider" },
  { key: "owner", label: "Owner Approved" },
  { key: "trip_started", label: "Trip Started" },
  { key: "trip_completed", label: "Trip Completed" },
];

export default function BookingTimeline({
  bookingStatus,
  cancelledByRole,
  createdAt,
  cancelledAt,
  className = "",
}: Props) {
  const isCancelled = bookingStatus.toLowerCase() === "cancelled";

  if (!isCancelled) {
    return (
      <div className={className}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Booking Timeline
        </p>
        <p className="text-sm text-gray-500">Timeline updates as your booking progresses.</p>
      </div>
    );
  }

  const cancelledLabel =
    cancelledByRole === "admin"
      ? "Cancelled by Admin"
      : cancelledByRole === "owner"
        ? "Cancelled by Owner"
        : "Cancelled by Rider";

  const steps = CANCELLED_STEPS.map((step) =>
    step.key === "cancelled" ? { ...step, label: cancelledLabel } : step
  );

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Booking Timeline
      </p>
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const complete = step.key === "created" || step.key === "cancelled";
          const isCancelledStep = step.key === "cancelled";
          const timestamp =
            step.key === "created" && createdAt
              ? formatDate(createdAt)
              : step.key === "cancelled" && cancelledAt
                ? formatDate(cancelledAt)
                : null;

          const dotClass = complete
            ? isCancelledStep
              ? "bg-red-500 border-red-500 text-white"
              : "bg-emerald-500 border-emerald-500 text-white"
            : "bg-white border-gray-300 text-gray-300";

          const lineClass = complete
            ? isCancelledStep
              ? "bg-red-200"
              : "bg-emerald-300"
            : "bg-gray-200";

          const labelClass = complete
            ? isCancelledStep
              ? "text-red-700 font-semibold"
              : "text-secondary font-medium"
            : "text-gray-400";

          return (
            <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 ${lineClass}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${dotClass}`}
              >
                {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm ${labelClass}`}>{step.label}</p>
                {timestamp && <p className="text-xs text-gray-500 mt-0.5">{timestamp}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
