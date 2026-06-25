"use client";

import { Check } from "lucide-react";
import { formatRefundStatusLabel } from "@/lib/bookings/my-bookings-utils";

type RefundStep = "processing" | "approved" | "completed";

interface Props {
  refundStatus?: string | null;
  refundAmount?: number | null;
  className?: string;
}

const STEPS: { key: RefundStep; label: string }[] = [
  { key: "processing", label: "Processing" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
];

function stepIndex(status: string): number {
  const key = status.toLowerCase();
  if (key === "refunded") return 2;
  if (key === "approved") return 1;
  if (key === "pending" || key === "processing") return 0;
  if (key === "rejected") return -1;
  return -1;
}

export default function RefundTracker({ refundStatus, refundAmount, className = "" }: Props) {
  if (!refundStatus) return null;

  const normalized = refundStatus.toLowerCase();
  if (normalized === "rejected") {
    return (
      <div className={`rounded-xl border border-red-100 bg-red-50/80 px-3 py-2.5 ${className}`}>
        <p className="text-xs font-semibold text-red-700">Refund not approved</p>
      </div>
    );
  }

  const current = stepIndex(normalized);

  return (
    <div className={`rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Refund Tracking
        </p>
        {refundAmount != null && refundAmount > 0 && (
          <p className="text-xs font-bold text-emerald-700 tabular-nums">
            ₹{refundAmount.toLocaleString("en-IN")}
          </p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {STEPS.map((step, index) => {
          const complete = current >= index;
          const active = current === index;

          return (
            <div key={step.key} className="flex flex-col items-center text-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  complete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-300 bg-white text-gray-300"
                } ${active ? "ring-4 ring-emerald-500/15 scale-105" : ""}`}
              >
                {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <p
                className={`mt-1.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${
                  complete ? "text-emerald-800" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-emerald-700/80 text-center">
        Status: {formatRefundStatusLabel(refundStatus)}
      </p>
    </div>
  );
}
