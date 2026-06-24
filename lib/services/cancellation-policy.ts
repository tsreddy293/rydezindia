/** Cancellation & refund rules — Rydez India marketplace. */

export type BookingTypeForPolicy =
  | "self_drive"
  | "with_driver"
  | "return_journey"
  | "local_rental";

export type RefundStatus =
  | "pending"
  | "approved"
  | "processing"
  | "refunded"
  | "rejected";

import {
  flexibleProtectionTierLabel,
  flexibleProtectionTripFarePercent,
} from "@/lib/services/flexible-cancellation-protection";

export const REFUND_PROCESSING_ESTIMATE =
  "Refund will be processed within 3-7 business days.";

export const FLEXIBLE_CANCELLATION_FEE = 99;
export const FLEXIBLE_CANCELLATION_HOURS = 6;

export interface CancellationPolicyBullet {
  text: string;
  highlight?: boolean;
}

export interface RefundCalculationInput {
  bookingType: BookingTypeForPolicy | string;
  tripFareAmount: number;
  securityDepositAmount?: number;
  pickupDate?: string | null;
  pickupTime?: string | null;
  cancelledAt?: Date;
  flexibleCancellation?: boolean;
  protectionSelected?: boolean;
  paymentStatus?: string | null;
}

export interface RefundCalculationResult {
  tripFareRefundPercent: number;
  securityDepositRefundPercent: number;
  tripFareRefundAmount: number;
  securityDepositRefundAmount: number;
  totalRefundAmount: number;
  afterScheduledStart: boolean;
  policyTier: string;
  flexibleApplied: boolean;
  refundEligible: boolean;
}

function parseScheduleDateTime(dateStr: string, timeStr?: string | null): Date | null {
  const date = dateStr.trim();
  if (!date) return null;
  const time = (timeStr?.trim() || "00:00").slice(0, 5);
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hoursBeforeScheduled(
  pickupDate?: string | null,
  pickupTime?: string | null,
  reference: Date = new Date()
): number | null {
  if (!pickupDate?.trim()) return null;
  const scheduled = parseScheduleDateTime(pickupDate, pickupTime);
  if (!scheduled) return null;
  return (scheduled.getTime() - reference.getTime()) / (1000 * 60 * 60);
}

export function normalizeBookingTypeForPolicy(
  bookingType?: string | null,
  tripType?: string | null
): BookingTypeForPolicy {
  const type = String(bookingType ?? "").toLowerCase().trim();
  if (type === "self_drive") return "self_drive";
  if (type === "return_journey") return "return_journey";
  if (type === "local_rental") return "local_rental";
  if (String(tripType ?? "").toLowerCase().includes("local rental")) return "local_rental";
  return "with_driver";
}

function selfDriveTripFarePercent(hoursBefore: number | null, afterStart: boolean): number {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return 0;
  if (hoursBefore >= 48) return 100;
  if (hoursBefore >= 24) return 90;
  if (hoursBefore >= 12) return 75;
  return 50;
}

function selfDriveDepositPercent(hoursBefore: number | null, afterStart: boolean): number {
  if (afterStart) return 0;
  return 100;
}

function withDriverPercent(hoursBefore: number | null, afterStart: boolean): number {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return 0;
  if (hoursBefore >= 24) return 100;
  if (hoursBefore >= 12) return 75;
  return 50;
}

function returnJourneyPercent(hoursBefore: number | null, afterStart: boolean): number {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return 0;
  if (hoursBefore >= 24) return 100;
  return 75;
}

function localRentalPercent(hoursBefore: number | null, afterStart: boolean): number {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return 0;
  if (hoursBefore >= 12) return 100;
  return 75;
}

function policyTierLabel(
  bookingType: BookingTypeForPolicy,
  hoursBefore: number | null,
  afterStart: boolean
): string {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return "After trip start — no trip fare refund";
  if (bookingType === "self_drive") {
    if (hoursBefore >= 48) return "More than 48 hours before pickup";
    if (hoursBefore >= 24) return "24–48 hours before pickup";
    if (hoursBefore >= 12) return "12–24 hours before pickup";
    return "Less than 12 hours before pickup";
  }
  if (bookingType === "with_driver") {
    if (hoursBefore >= 24) return "More than 24 hours before journey";
    if (hoursBefore >= 12) return "12–24 hours before journey";
    return "Less than 12 hours before journey";
  }
  if (bookingType === "return_journey") {
    return hoursBefore >= 24 ? "More than 24 hours before departure" : "Less than 24 hours before departure";
  }
  return hoursBefore >= 12 ? "More than 12 hours before booking" : "Less than 12 hours before booking";
}

export function calculateRefund(input: RefundCalculationInput): RefundCalculationResult {
  const bookingType = normalizeBookingTypeForPolicy(input.bookingType);
  const hoursBefore = hoursBeforeScheduled(input.pickupDate, input.pickupTime, input.cancelledAt);
  const afterStart = hoursBefore !== null && hoursBefore < 0;
  const tripFare = Math.max(0, Math.round(input.tripFareAmount));
  const deposit = Math.max(0, Math.round(input.securityDepositAmount ?? 0));

  let tripFareRefundPercent = 0;
  let securityDepositRefundPercent = 0;

  switch (bookingType) {
    case "self_drive":
      tripFareRefundPercent = selfDriveTripFarePercent(hoursBefore, afterStart);
      securityDepositRefundPercent = selfDriveDepositPercent(hoursBefore, afterStart);
      break;
    case "with_driver":
      tripFareRefundPercent = withDriverPercent(hoursBefore, afterStart);
      securityDepositRefundPercent = 0;
      break;
    case "return_journey":
      tripFareRefundPercent = returnJourneyPercent(hoursBefore, afterStart);
      securityDepositRefundPercent = 0;
      break;
    case "local_rental":
      tripFareRefundPercent = localRentalPercent(hoursBefore, afterStart);
      securityDepositRefundPercent = 0;
      break;
  }

  let flexibleApplied = false;
  const hasProtection = Boolean(input.flexibleCancellation || input.protectionSelected);

  if (bookingType === "self_drive" && hasProtection && hoursBefore !== null && !afterStart) {
    tripFareRefundPercent = flexibleProtectionTripFarePercent(hoursBefore, afterStart);
    flexibleApplied = true;
  }

  const paid = String(input.paymentStatus ?? "").toLowerCase();
  const refundEligible = paid === "paid" || paid === "partial";

  const tripFareRefundAmount = refundEligible
    ? Math.round((tripFare * tripFareRefundPercent) / 100)
    : 0;
  const securityDepositRefundAmount =
    refundEligible && deposit > 0
      ? Math.round((deposit * securityDepositRefundPercent) / 100)
      : 0;

  return {
    tripFareRefundPercent,
    securityDepositRefundPercent,
    tripFareRefundAmount,
    securityDepositRefundAmount,
    totalRefundAmount: tripFareRefundAmount + securityDepositRefundAmount,
    afterScheduledStart: afterStart,
    policyTier: flexibleApplied
      ? flexibleProtectionTierLabel(hoursBefore, afterStart)
      : policyTierLabel(bookingType, hoursBefore, afterStart),
    flexibleApplied,
    refundEligible,
  };
}

export function getCancellationPolicyBullets(
  bookingType: BookingTypeForPolicy | string
): CancellationPolicyBullet[] {
  const type = normalizeBookingTypeForPolicy(String(bookingType));

  if (type === "self_drive") {
    return [
      { text: "Free cancellation up to 48 hours before pickup", highlight: true },
      { text: "90% trip fare refund between 24–48 hours" },
      { text: "75% trip fare refund between 12–24 hours" },
      { text: "50% trip fare refund within 12 hours" },
      { text: "No trip fare refund after pickup time" },
      { text: "Security deposit refunded separately after inspection", highlight: true },
    ];
  }

  if (type === "with_driver") {
    return [
      { text: "100% refund more than 24 hours before journey", highlight: true },
      { text: "75% refund between 12–24 hours before journey" },
      { text: "50% refund within 12 hours of journey" },
      { text: "No refund after journey start time" },
    ];
  }

  if (type === "return_journey") {
    return [
      { text: "100% refund more than 24 hours before departure", highlight: true },
      { text: "75% refund within 24 hours of departure" },
      { text: "No refund after departure time" },
    ];
  }

  return [
    { text: "100% refund more than 12 hours before booking", highlight: true },
    { text: "75% refund within 12 hours of booking start" },
    { text: "No refund after booking start time" },
  ];
}

export function getCancellationPolicyTitle(bookingType: BookingTypeForPolicy | string): string {
  const type = normalizeBookingTypeForPolicy(String(bookingType));
  const labels: Record<BookingTypeForPolicy, string> = {
    self_drive: "Self Drive Cancellation",
    with_driver: "Vehicle With Driver Cancellation",
    return_journey: "Return Journey Cancellation",
    local_rental: "Local Rental Cancellation",
  };
  return labels[type];
}
