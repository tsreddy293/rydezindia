/** Self-drive rental: daily rent × days + platform fee + GST. Security deposit is separate. */

import {
  formatDepositRange,
  getTier2DepositRange,
} from "@/lib/vehicles/search";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";

export const SELF_DRIVE_PLATFORM_FEE_PERCENT = 5;
/** GST applied on the platform fee (18% × ₹75 = ₹14 for a ₹1500 daily rent). */
export const SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT = 18;

export const SELF_DRIVE_DEPOSIT_TOOLTIP =
  "Refunded after successful vehicle inspection.";

export const SELF_DRIVE_DEPOSIT_BENEFITS = [
  "Fully Refundable",
  "Refunded After Inspection",
  "No Damage Charges",
  "No Traffic Violations",
] as const;

export const SELF_DRIVE_DEPOSIT_PICKUP_NOTE = "Deposit Collected At Vehicle Pickup";

export interface SelfDriveDepositInfo {
  /** Amount charged online when not collected at pickup. */
  amount: number;
  min: number;
  max: number;
  displayLabel: string;
  collectedAtPickup: boolean;
  isExplicit: boolean;
}

export interface SelfDriveRentalSchedule {
  pickupDate: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
}

export interface SelfDrivePricingResult {
  dailyRent: number;
  rentalDays: number;
  vehicleRentTotal: number;
  platformFee: number;
  gst: number;
  /** Trip fare (vehicle rent + platform fee + GST) — excludes deposit. */
  payableAmount: number;
  deposit: SelfDriveDepositInfo;
  /** @deprecated Use deposit.amount — kept for legacy callers. */
  securityDeposit: number;
}

export function formatSelfDriveRentalDays(days: number): string {
  const n = Math.max(1, Math.round(days));
  return n === 1 ? "1 Day" : `${n} Days`;
}

function parseScheduleDateTime(dateStr: string, timeStr?: string): Date | null {
  const date = dateStr.trim();
  if (!date) return null;
  const time = (timeStr?.trim() || "00:00").slice(0, 5);
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Rental days from pickup → return; partial days round up (24h blocks). */
export function computeSelfDriveRentalDays(schedule: SelfDriveRentalSchedule): number {
  const pickup = parseScheduleDateTime(schedule.pickupDate, schedule.pickupTime);
  if (!pickup) return 1;

  const returnAt = schedule.returnDate?.trim()
    ? parseScheduleDateTime(schedule.returnDate, schedule.returnTime)
    : null;

  if (!returnAt || returnAt.getTime() <= pickup.getTime()) return 1;

  const diffHours = (returnAt.getTime() - pickup.getTime()) / (1000 * 60 * 60);
  return Math.max(1, Math.ceil(diffHours / 24));
}

export function resolveSelfDriveDepositInfo(listing: {
  security_deposit?: number;
  vehicle_type?: string;
}): SelfDriveDepositInfo {
  const category = listing.vehicle_type ?? "";
  const stored = Math.max(0, Math.round(Number(listing.security_deposit) || 0));
  const range = getTier2DepositRange(category);

  if (stored > 0) {
    return {
      amount: stored,
      min: stored,
      max: stored,
      displayLabel: formatDepositRange({ min: stored, max: stored }),
      collectedAtPickup: false,
      isExplicit: true,
    };
  }

  return {
    amount: 0,
    min: range.min,
    max: range.max,
    displayLabel: formatDepositRange(range),
    collectedAtPickup: true,
    isExplicit: false,
  };
}

/** @deprecated Prefer resolveSelfDriveDepositInfo */
export function resolveSelfDriveSecurityDeposit(listing: {
  security_deposit?: number;
  vehicle_type?: string;
}): number {
  const info = resolveSelfDriveDepositInfo(listing);
  return info.collectedAtPickup ? 0 : info.amount;
}

export function calculateSelfDrivePricing(
  dailyRent: number,
  depositInfo: SelfDriveDepositInfo,
  rentalDays = 1
): SelfDrivePricingResult {
  const days = Math.max(1, Math.round(rentalDays));
  const normalizedRent = Math.max(0, Math.round(dailyRent));
  const vehicleRentTotal = normalizedRent * days;
  const platformFee = Math.round(vehicleRentTotal * (SELF_DRIVE_PLATFORM_FEE_PERCENT / 100));
  const gst = Math.round(platformFee * (SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT / 100));
  const payableAmount = vehicleRentTotal + platformFee + gst;
  const onlineDeposit = depositInfo.collectedAtPickup ? 0 : depositInfo.amount;

  return {
    dailyRent: normalizedRent,
    rentalDays: days,
    vehicleRentTotal,
    platformFee,
    gst,
    payableAmount,
    deposit: depositInfo,
    securityDeposit: onlineDeposit,
  };
}

export function calculateSelfDrivePricingForSchedule(
  dailyRent: number,
  depositInfo: SelfDriveDepositInfo,
  schedule: SelfDriveRentalSchedule
): SelfDrivePricingResult {
  return calculateSelfDrivePricing(
    dailyRent,
    depositInfo,
    computeSelfDriveRentalDays(schedule)
  );
}

/** Trip fare (or advance) plus online deposit when applicable. */
export function calculateSelfDriveCheckoutAmount(
  pricing: SelfDrivePricingResult,
  paymentType: "advance" | "full" = "full"
): number {
  const farePortion = getAdvancePaymentAmount(pricing.payableAmount, paymentType);
  if (pricing.deposit.collectedAtPickup) return farePortion;
  return farePortion + pricing.deposit.amount;
}

export function resolveSelfDriveDailyRent(listing: {
  price?: number;
  daily_rent?: number;
}): number {
  const rent = listing.daily_rent || listing.price || 0;
  return Math.max(0, Math.round(rent));
}
