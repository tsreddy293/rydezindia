"use client";

import { Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { isRiderPaymentCompleted } from "@/lib/bookings/my-bookings-utils";

type TimelineStep =
  | "created"
  | "payment"
  | "owner_confirmed"
  | "trip_started"
  | "trip_completed"
  | "cancelled"
  | "refund_processing"
  | "refund_completed";

interface Props {
  bookingStatus: string;
  paymentStatus?: string;
  cancellationStatus?: string | null;
  refundStatus?: string | null;
  createdAt?: string;
  cancelledAt?: string | null;
  refundProcessedAt?: string | null;
  pickupDate?: string;
  pickupTime?: string;
  className?: string;
}

const ALL_STEPS: { key: TimelineStep; label: string }[] = [
  { key: "created", label: "Booking Created" },
  { key: "payment", label: "Payment Completed" },
  { key: "owner_confirmed", label: "Owner Confirmed" },
  { key: "trip_started", label: "Trip Started" },
  { key: "trip_completed", label: "Trip Completed" },
  { key: "cancelled", label: "Booking Cancelled" },
  { key: "refund_processing", label: "Refund Processing" },
  { key: "refund_completed", label: "Refund Completed" },
];

function buildVisibleSteps(ctx: {
  isCancelled: boolean;
  hasRefund: boolean;
  paymentCompleted: boolean;
}): TimelineStep[] {
  if (ctx.isCancelled) {
    const steps: TimelineStep[] = ["created"];
    if (ctx.paymentCompleted) steps.push("payment");
    steps.push("cancelled");
    if (ctx.hasRefund) steps.push("refund_processing", "refund_completed");
    return steps;
  }
  return ["created", "payment", "owner_confirmed", "trip_started", "trip_completed"];
}

function stepState(
  step: TimelineStep,
  ctx: {
    bookingStatus: string;
    paymentStatus: string;
    isCancelled: boolean;
    refundStatus: string;
    hasRefund: boolean;
  }
): "complete" | "current" | "upcoming" {
  const booking = ctx.bookingStatus.toLowerCase();
  const payment = ctx.paymentStatus.toLowerCase();
  const refund = ctx.refundStatus;

  switch (step) {
    case "created":
      return "complete";
    case "payment":
      if (
        payment === "paid" ||
        payment === "partial" ||
        payment === "payment_completed" ||
        ["payment_completed", "awaiting_owner_approval", "awaiting_admin_approval", "owner_confirmed", "trip_started", "trip_completed", "confirmed", "active", "completed"].includes(booking)
      ) {
        return "complete";
      }
      if (booking === "payment_pending" || booking === "booking_created" || booking === "pending")
        return "current";
      return "upcoming";
    case "owner_confirmed":
      if (ctx.isCancelled || ["confirmed", "active", "completed"].includes(booking)) return "complete";
      if (payment === "paid" || payment === "partial") return "current";
      return "upcoming";
    case "trip_started":
      if (booking === "active" || booking === "completed") return "complete";
      if (booking === "confirmed") return "current";
      return "upcoming";
    case "trip_completed":
      if (booking === "completed") return "complete";
      if (booking === "active") return "current";
      return "upcoming";
    case "cancelled":
      return ctx.isCancelled ? "complete" : "upcoming";
    case "refund_processing":
      if (!ctx.isCancelled || !ctx.hasRefund) return "upcoming";
      if (refund === "refunded") return "complete";
      if (["pending", "approved", "processing"].includes(refund)) return "current";
      return "upcoming";
    case "refund_completed":
      if (refund === "refunded") return "complete";
      if (ctx.isCancelled && ctx.hasRefund && ["pending", "approved", "processing"].includes(refund))
        return "upcoming";
      return "upcoming";
    default:
      return "upcoming";
  }
}

function stepTimestamp(
  step: TimelineStep,
  ctx: {
    createdAt?: string;
    cancelledAt?: string | null;
    refundProcessedAt?: string | null;
    refundStatus: string;
  }
): string | null {
  if (step === "created" && ctx.createdAt) return formatDate(ctx.createdAt);
  if (step === "payment" && ctx.createdAt) return formatDate(ctx.createdAt);
  if (step === "owner_confirmed" && ctx.createdAt) return formatDate(ctx.createdAt);
  if (step === "cancelled" && ctx.cancelledAt) return formatDate(ctx.cancelledAt);
  if (step === "refund_processing" && ctx.cancelledAt) return formatDate(ctx.cancelledAt);
  if (step === "refund_completed" && ctx.refundProcessedAt) return formatDate(ctx.refundProcessedAt);
  if (step === "refund_completed" && ctx.refundStatus === "rejected") return "Not eligible";
  return null;
}

export default function BookingTimeline({
  bookingStatus,
  paymentStatus = "pending",
  cancellationStatus,
  refundStatus,
  createdAt,
  cancelledAt,
  refundProcessedAt,
  className = "",
}: Props) {
  const isCancelled =
    cancellationStatus === "cancelled" || bookingStatus.toLowerCase() === "cancelled";
  const normalizedRefundStatus = (refundStatus ?? "").toLowerCase();
  const paymentCompleted = isRiderPaymentCompleted(paymentStatus);
  const hasRefund =
    isCancelled &&
    paymentCompleted &&
    normalizedRefundStatus !== "rejected" &&
    normalizedRefundStatus !== "";

  const ctx = {
    bookingStatus,
    paymentStatus,
    isCancelled,
    refundStatus: normalizedRefundStatus,
    hasRefund,
    paymentCompleted,
    createdAt,
    cancelledAt,
    refundProcessedAt,
  };

  const visibleSteps = buildVisibleSteps({ isCancelled, hasRefund, paymentCompleted });
  const steps = ALL_STEPS.filter((s) => visibleSteps.includes(s.key));

  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Booking Timeline
      </p>
      <ol className="relative space-y-0">
        {steps.map((step, index) => {
          const state = stepState(step.key, ctx);
          const timestamp = stepTimestamp(step.key, ctx);
          const isLast = index === steps.length - 1;

          const dotClass =
            state === "complete"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : state === "current"
                ? "bg-primary border-primary text-white ring-4 ring-primary/15"
                : "bg-white border-gray-300 text-gray-300";

          const labelClass =
            state === "complete"
              ? "text-secondary font-medium"
              : state === "current"
                ? "text-primary font-semibold"
                : "text-gray-400";

          return (
            <li
              key={step.key}
              className="relative flex gap-3 pb-4 last:pb-0 transition-opacity duration-300"
            >
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 transition-colors duration-300 ${
                    state === "complete" ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${dotClass}`}
              >
                {state === "complete" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm ${labelClass}`}>{step.label}</p>
                {timestamp ? (
                  <p className="text-xs text-gray-500 mt-0.5">{timestamp}</p>
                ) : state === "current" ? (
                  <p className="text-xs text-primary/80 mt-0.5">In progress</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
