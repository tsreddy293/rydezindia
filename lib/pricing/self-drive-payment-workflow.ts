import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import {
  formatDepositRange,
  getTier2DepositRange,
} from "@/lib/vehicles/search";
import {
  computeTripFareBeforeLongDurationDiscount,
  computeTripFareLongDurationSavings,
  type SelfDrivePricingResult,
} from "@/lib/pricing/self-drive-pricing";

/** Self-drive booking always collects 100% refundable deposit online at first checkout. */
export function resolveSelfDriveBookingDeposit(listing: {
  security_deposit?: number;
  vehicle_type?: string;
}): number {
  const stored = Math.max(0, Math.round(Number(listing.security_deposit) || 0));
  if (stored > 0) return stored;
  const range = getTier2DepositRange(listing.vehicle_type ?? "Sedan");
  return range.max;
}

export interface SelfDrivePaymentWorkflowInput {
  tripFare: number;
  securityDeposit: number;
  protectionFee?: number;
  /** Display-only: gross trip fare before long-duration discount. */
  tripFareBeforeDiscount?: number;
  longDurationDiscountAmount?: number;
  longDurationDiscountPercent?: number;
  rentalDays?: number;
}

export interface SelfDrivePaymentWorkflowResult {
  tripFare: number;
  advanceAmount: number;
  balanceAmount: number;
  securityDeposit: number;
  protectionFee: number;
  amountPayableNow: number;
  amountDue: number;
  expectedDepositRefund: number;
  tripFareBeforeDiscount: number;
  longDurationDiscountAmount: number;
  longDurationDiscountPercent: number;
  rentalDays: number;
}

export function calculateSelfDrivePaymentWorkflow(
  input: SelfDrivePaymentWorkflowInput
): SelfDrivePaymentWorkflowResult {
  const tripFare = Math.max(0, Math.round(input.tripFare));
  const advanceAmount = getAdvancePaymentAmount(tripFare, "advance");
  const balanceAmount = Math.max(0, tripFare - advanceAmount);
  const securityDeposit = Math.max(0, Math.round(input.securityDeposit));
  const protectionFee = Math.max(0, Math.round(input.protectionFee ?? 0));
  const amountPayableNow = advanceAmount + securityDeposit + protectionFee;
  const discountAmount = Math.max(0, Math.round(input.longDurationDiscountAmount ?? 0));

  return {
    tripFare,
    advanceAmount,
    balanceAmount,
    securityDeposit,
    protectionFee,
    amountPayableNow,
    amountDue: balanceAmount,
    expectedDepositRefund: securityDeposit,
    tripFareBeforeDiscount: Math.max(
      tripFare,
      Math.round(input.tripFareBeforeDiscount ?? tripFare + discountAmount)
    ),
    longDurationDiscountAmount: discountAmount,
    longDurationDiscountPercent: input.longDurationDiscountPercent ?? 0,
    rentalDays: input.rentalDays ?? 1,
  };
}

export function calculateSelfDrivePaymentWorkflowFromPricing(
  pricing: SelfDrivePricingResult,
  protectionFee = 0,
  listing?: { security_deposit?: number; vehicle_type?: string }
): SelfDrivePaymentWorkflowResult {
  const deposit =
    listing != null
      ? resolveSelfDriveBookingDeposit(listing)
      : pricing.deposit.collectedAtPickup
        ? pricing.deposit.max
        : pricing.deposit.amount;

  const tripFareBeforeDiscount = computeTripFareBeforeLongDurationDiscount(pricing);
  const longDurationDiscountAmount = computeTripFareLongDurationSavings(pricing);

  return calculateSelfDrivePaymentWorkflow({
    tripFare: pricing.payableAmount,
    securityDeposit: deposit,
    protectionFee,
    tripFareBeforeDiscount,
    longDurationDiscountAmount,
    longDurationDiscountPercent: pricing.longDurationDiscountPercent,
    rentalDays: pricing.rentalDays,
  });
}

export function formatSelfDriveDepositLabel(amount: number): string {
  return formatDepositRange({ min: amount, max: amount });
}
