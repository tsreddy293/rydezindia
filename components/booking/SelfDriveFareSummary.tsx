"use client";

import { useId, useState } from "react";
import { Check, Info, MapPin, ShieldCheck } from "lucide-react";
import {
  SELF_DRIVE_DEPOSIT_BENEFITS,
  SELF_DRIVE_DEPOSIT_PICKUP_NOTE,
  SELF_DRIVE_DEPOSIT_TOOLTIP,
  calculateSelfDriveCheckoutAmount,
  formatLongDurationDiscountLabel,
  formatSelfDriveRentalDays,
  type SelfDrivePricingResult,
} from "@/lib/pricing/self-drive-pricing";
import { formatINR } from "@/lib/utils";

interface SelfDriveFareSummaryProps {
  pricing: SelfDrivePricingResult;
  variant?: "dark" | "light";
  paymentType?: "advance" | "full";
  showLineItems?: boolean;
  protectionSelected?: boolean;
  protectionFee?: number;
}

function DepositInfoTooltip({ variant }: { variant: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  const buttonClass =
    variant === "dark"
      ? "text-white/55 hover:text-accent"
      : "text-gray-400 hover:text-primary";

  const panelClass =
    variant === "dark"
      ? "border-white/15 bg-secondary/95 text-white shadow-xl"
      : "border-gray-200 bg-white text-secondary shadow-lg";

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label="Security deposit information"
        aria-describedby={open ? tooltipId : undefined}
        className={`rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${buttonClass}`}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border px-3 py-2 text-[11px] leading-snug sm:w-52 sm:text-xs ${panelClass}`}
        >
          {SELF_DRIVE_DEPOSIT_TOOLTIP}
        </span>
      ) : null}
    </span>
  );
}

export default function SelfDriveFareSummary({
  pricing,
  variant = "dark",
  paymentType = "full",
  showLineItems = true,
  protectionSelected = false,
  protectionFee = 0,
}: SelfDriveFareSummaryProps) {
  const isDark = variant === "dark";
  const { deposit } = pricing;
  const mutedClass = isDark ? "text-white/65" : "text-gray-500";
  const labelClass = isDark ? "text-white/90" : "text-gray-800";
  const dividerClass = isDark ? "border-white/12" : "border-gray-200";
  const rowClass = "flex items-start justify-between gap-3";
  const savingsClass = isDark ? "text-emerald-300" : "text-emerald-600";

  const tripFare = pricing.payableAmount;
  const protection = protectionSelected ? protectionFee : 0;
  const checkoutBase = calculateSelfDriveCheckoutAmount(pricing, paymentType);
  const totalPayableNow = checkoutBase + protection;
  const displayGrandTotal = tripFare + pricing.deposit.amount + protection;
  const depositDisplayAmount = deposit.collectedAtPickup
    ? deposit.displayLabel
    : formatINR(deposit.amount);
  const hasDiscount = pricing.longDurationDiscountAmount > 0;

  const depositCardClass = isDark
    ? "border-accent/20 bg-gradient-to-br from-white/[0.08] via-accent/[0.06] to-primary/[0.08]"
    : "border-primary/15 bg-gradient-to-br from-slate-50 via-white to-primary/[0.04]";

  const checkClass = isDark ? "text-emerald-400" : "text-emerald-600";

  const lineItems = (
    <div className={`space-y-1.5 text-xs sm:text-sm ${mutedClass}`}>
      <div className={rowClass}>
        <span>Daily Rent</span>
        <span className={`font-medium tabular-nums ${labelClass}`}>{formatINR(pricing.dailyRent)}</span>
      </div>
      <div className={rowClass}>
        <span>Rental Duration</span>
        <span className={`font-medium ${labelClass}`}>{formatSelfDriveRentalDays(pricing.rentalDays)}</span>
      </div>
      <div className={rowClass}>
        <span>Vehicle Rent Total</span>
        <span className={`font-medium tabular-nums ${labelClass}`}>
          {formatINR(pricing.vehicleRentTotal)}
        </span>
      </div>
      {hasDiscount ? (
        <>
          <div className={rowClass}>
            <span className={savingsClass}>
              {formatLongDurationDiscountLabel(pricing.longDurationDiscountPercent)}
            </span>
            <span className={`font-semibold tabular-nums ${savingsClass}`}>
              -{formatINR(pricing.longDurationDiscountAmount)}
            </span>
          </div>
          <div className={rowClass}>
            <span>Discounted Fare</span>
            <span className={`font-medium tabular-nums ${labelClass}`}>
              {formatINR(pricing.discountedVehicleRentTotal)}
            </span>
          </div>
        </>
      ) : (
        <div className={rowClass}>
          <span>Discounted Fare</span>
          <span className={`font-medium tabular-nums ${labelClass}`}>
            {formatINR(pricing.discountedVehicleRentTotal)}
          </span>
        </div>
      )}
      <div className={rowClass}>
        <span>Platform Fee</span>
        <span className={`font-medium tabular-nums ${labelClass}`}>{formatINR(pricing.platformFee)}</span>
      </div>
      <div className={rowClass}>
        <span>GST</span>
        <span className={`font-medium tabular-nums ${labelClass}`}>{formatINR(pricing.gst)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 text-sm">
      {showLineItems ? lineItems : null}

      <div className={`space-y-2.5 rounded-xl border px-3 py-3 sm:px-3.5 sm:py-3.5 ${depositCardClass}`}>
        {!showLineItems ? (
          <div className={`mb-2 space-y-1.5 border-b pb-2.5 text-xs sm:text-sm ${dividerClass} ${mutedClass}`}>
            {lineItems}
          </div>
        ) : null}

        <div className={`${rowClass} border-b pb-2.5 ${dividerClass}`}>
          <span className={`text-xs font-semibold sm:text-sm ${labelClass}`}>Trip Fare</span>
          <span className={`text-sm font-bold tabular-nums sm:text-base ${isDark ? "text-white" : "text-secondary"}`}>
            {formatINR(tripFare)}
          </span>
        </div>

        {hasDiscount && (
          <p className={`text-[11px] sm:text-xs font-medium ${savingsClass}`}>
            You save {formatINR(pricing.longDurationDiscountAmount)} on this long rental
          </p>
        )}

        <div className={rowClass}>
          <div className="flex min-w-0 items-center gap-1">
            <ShieldCheck
              className={`h-4 w-4 shrink-0 ${isDark ? "text-accent" : "text-primary"}`}
              aria-hidden
            />
            <span className={`text-xs font-semibold leading-tight sm:text-sm ${labelClass}`}>
              Refundable Deposit
            </span>
            <DepositInfoTooltip variant={variant} />
          </div>
          <span
            className={`shrink-0 text-right text-xs font-bold leading-tight tabular-nums sm:text-sm ${
              isDark ? "text-accent" : "text-primary"
            }`}
          >
            {depositDisplayAmount}
          </span>
        </div>

        <ul className={`grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1.5 text-[10px] sm:text-[11px] ${mutedClass}`}>
          {SELF_DRIVE_DEPOSIT_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-1.5">
              <Check className={`h-3 w-3 shrink-0 ${checkClass}`} strokeWidth={2.5} aria-hidden />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {deposit.collectedAtPickup ? (
          <div
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-medium leading-snug sm:text-[11px] ${
              isDark
                ? "border-accent/25 bg-accent/10 text-accent"
                : "border-primary/20 bg-primary/[0.06] text-primary"
            }`}
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{SELF_DRIVE_DEPOSIT_PICKUP_NOTE}</span>
          </div>
        ) : (
          <p className={`text-[10px] leading-relaxed sm:text-[11px] ${mutedClass}`}>
            Refundable deposit is included in your online payment and returned after vehicle inspection.
          </p>
        )}

        {protectionSelected && protection > 0 ? (
          <div className={`${rowClass} border-t pt-2.5 ${dividerClass}`}>
            <div className="flex min-w-0 items-center gap-1.5">
              <ShieldCheck className={`h-4 w-4 shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
              <span className={`text-xs font-semibold sm:text-sm ${labelClass}`}>
                Flexible Protection
              </span>
            </div>
            <span className={`shrink-0 font-bold tabular-nums ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
              {formatINR(protection)}
            </span>
          </div>
        ) : null}
      </div>

      <div
        className={`${rowClass} rounded-xl border px-3 py-3 sm:px-3.5 ${
          isDark
            ? "border-primary/45 bg-gradient-to-r from-primary/20 to-blue-600/15"
            : "border-primary/25 bg-primary/[0.07]"
        }`}
      >
        <div className="min-w-0">
          <p className={`text-sm font-bold sm:text-base ${isDark ? "text-white" : "text-secondary"}`}>
            Grand Total
          </p>
          <p className={`mt-0.5 text-[10px] sm:text-[11px] ${mutedClass}`}>
            {paymentType === "advance"
              ? protectionSelected
                ? "30% trip advance + protection"
                : "30% trip advance"
              : deposit.collectedAtPickup
                ? protectionSelected
                  ? "Trip fare + protection · deposit at pickup"
                  : "Trip fare · deposit at pickup"
                : protectionSelected
                  ? "Trip fare + deposit + protection"
                  : "Trip fare + refundable deposit"}
          </p>
        </div>
        <span
          className={`shrink-0 text-lg font-bold tabular-nums sm:text-xl ${isDark ? "text-accent" : "text-primary"}`}
        >
          {formatINR(paymentType === "full" ? displayGrandTotal : totalPayableNow)}
        </span>
      </div>
    </div>
  );
}
