"use client";

import { ShieldCheck } from "lucide-react";
import type { SelfDrivePaymentWorkflowResult } from "@/lib/pricing/self-drive-payment-workflow";
import { formatLongDurationDiscountLabel } from "@/lib/pricing/self-drive-long-duration-discount";
import { formatINR } from "@/lib/utils";

interface Props {
  workflow: SelfDrivePaymentWorkflowResult;
  variant?: "dark" | "light";
  /** When false, hides balance/deposit-refund preview (checkout sidebar only). */
  showBalancePreview?: boolean;
  /** When false, hides the payable total row (e.g. sticky mobile bar). */
  showPayableTotal?: boolean;
  /** Premium checkout layout with trust message and balance info box. */
  layout?: "default" | "checkout";
  payableLabel?: string;
}

export default function SelfDrivePaymentWorkflowSummary({
  workflow,
  variant = "dark",
  showBalancePreview = true,
  showPayableTotal = true,
  layout = "default",
  payableLabel = "Amount Payable Now",
}: Props) {
  const isDark = variant === "dark";
  const muted = isDark ? "text-white/65" : "text-gray-500";
  const label = isDark ? "text-white/90" : "text-gray-800";
  const row = "flex items-center justify-between gap-3 text-sm";
  const divider = isDark ? "border-white/12" : "border-gray-200";
  const isCheckout = layout === "checkout";
  const hasDiscount = workflow.longDurationDiscountAmount > 0;

  const lineItems = (
    <div className={`space-y-2.5 ${isCheckout ? "" : `border-b pb-3 ${divider}`}`}>
      <div className={row}>
        <span className={muted}>Trip Fare</span>
        <span className={`font-semibold tabular-nums ${label}`}>
          {formatINR(hasDiscount ? workflow.tripFareBeforeDiscount : workflow.tripFare)}
        </span>
      </div>
      {hasDiscount && (
        <div className={row}>
          <span className={`${muted} text-emerald-700`}>
            {formatLongDurationDiscountLabel(workflow.longDurationDiscountPercent)}
          </span>
          <span className="font-semibold tabular-nums text-emerald-700">
            -{formatINR(workflow.longDurationDiscountAmount)}
          </span>
        </div>
      )}
      <div className={row}>
        <span className={muted}>Advance Payment (30%)</span>
        <span className={`font-semibold tabular-nums ${label}`}>
          {formatINR(workflow.advanceAmount)}
        </span>
      </div>
      <div className={row}>
        <span className={muted}>Refundable Security Deposit</span>
        <span
          className={`font-semibold tabular-nums ${isDark ? "text-accent" : "text-primary"}`}
        >
          {formatINR(workflow.securityDeposit)}
        </span>
      </div>
      {workflow.protectionFee > 0 && (
        <div className={row}>
          <span className={muted}>Flexible Cancellation</span>
          <span className={`font-semibold tabular-nums ${label}`}>
            {formatINR(workflow.protectionFee)}
          </span>
        </div>
      )}
    </div>
  );

  const payableBlock = showPayableTotal && (
    <>
      <div className={`border-t ${divider}`} />
      <div
        className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3.5 ${
          isDark
            ? "bg-gradient-to-r from-primary/20 to-blue-600/10"
            : "bg-primary/[0.07] ring-1 ring-primary/20"
        }`}
      >
        <span className={`font-bold ${isDark ? "text-white" : "text-secondary"}`}>
          {payableLabel}
        </span>
        <span
          className={`text-lg font-bold tabular-nums ${isDark ? "text-accent" : "text-primary"}`}
        >
          {formatINR(workflow.amountPayableNow)}
        </span>
      </div>
    </>
  );

  const trustMessage = isCheckout && showPayableTotal && (
    <p className="flex items-start gap-2 rounded-lg bg-emerald-50/80 px-3 py-2.5 text-[11px] leading-relaxed text-emerald-800">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span>
        Refundable Security Deposit will be automatically refunded after successful vehicle return
        and inspection, subject to no damages or traffic violations.
      </span>
    </p>
  );

  const balanceBox = isCheckout ? (
    <>
      <div className={`border-t ${divider}`} />
      <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-3">
        <div className={row}>
          <span className="font-medium text-slate-600">Remaining Balance</span>
          <span className="text-base font-bold tabular-nums text-slate-800">
            {formatINR(workflow.balanceAmount)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Due before vehicle pickup</p>
      </div>
    </>
  ) : (
    showBalancePreview && (
      <div
        className={`space-y-2 rounded-xl border px-3 py-3 ${
          isDark ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50"
        }`}
      >
        <div className={row}>
          <span className={muted}>Remaining Balance (70%)</span>
          <span className={`font-bold tabular-nums ${isDark ? "text-amber-300" : "text-slate-700"}`}>
            {formatINR(workflow.balanceAmount)}
          </span>
        </div>
        <p className={`text-[11px] ${muted}`}>
          Balance payment must be completed before vehicle pickup.
        </p>
        <div className={row}>
          <span className={muted}>Expected Deposit Refund</span>
          <span
            className={`font-semibold tabular-nums ${isDark ? "text-emerald-300" : "text-emerald-700"}`}
          >
            {formatINR(workflow.expectedDepositRefund)}
          </span>
        </div>
      </div>
    )
  );

  if (isCheckout) {
    return (
      <div className="space-y-3">
        {lineItems}
        {payableBlock}
        {trustMessage}
        {balanceBox}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lineItems}
      {payableBlock}
      {balanceBox}
    </div>
  );
}
