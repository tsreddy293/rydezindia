import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";
import { stripProtectionMarker } from "@/lib/bookings/protection-instructions";

/** Production payment_status enum values used by Rydez (do not add new enum labels). */
export const BOOKING_PAYMENT_STATUS = {
  PENDING: "pending",
  PARTIAL: "partial",
  PAID: "paid",
  REFUNDED: "refunded",
} as const;

export type BookingPaymentStatus =
  (typeof BOOKING_PAYMENT_STATUS)[keyof typeof BOOKING_PAYMENT_STATUS];

/** Operational trip stages — stored in special_instructions marker (not booking_status). */
export const SELF_DRIVE_OPERATIONAL_STAGES = [
  "none",
  "handed_over",
  "trip_started",
  "trip_completed",
] as const;

export type SelfDriveOperationalStage = (typeof SELF_DRIVE_OPERATIONAL_STAGES)[number];

export type DepositRefundStatus = "none" | "pending" | "processing" | "refunded" | "partial";

export interface SelfDrivePaymentSnapshot {
  tripFare: number;
  advanceAmount: number;
  balanceAmount: number;
  securityDeposit: number;
  amountPaid: number;
  amountDue: number;
  depositRefundAmount: number;
  depositRefundStatus: DepositRefundStatus;
  damageCharges?: number;
  operationalStage?: SelfDriveOperationalStage;
}

const SD_PAYMENT_MARKER =
  /\[rydez:sd_pay trip=(\d+) advance=(\d+) balance=(\d+) deposit=(\d+) paid=(\d+) due=(\d+)(?: refund_amt=(\d+) refund_status=([a-z_]+))?(?: damage=(\d+))?(?: stage=([a-z_]+))?\]/i;

const SD_STAGE_MARKER = /\[rydez:sd_stage ([a-z_]+)\]/i;

export function encodeSelfDrivePaymentMarker(snapshot: SelfDrivePaymentSnapshot): string {
  const refundAmt = snapshot.depositRefundAmount ?? 0;
  const refundStatus = snapshot.depositRefundStatus ?? "none";
  const damage = snapshot.damageCharges ?? 0;
  const stage = snapshot.operationalStage ?? "none";
  return `[rydez:sd_pay trip=${snapshot.tripFare} advance=${snapshot.advanceAmount} balance=${snapshot.balanceAmount} deposit=${snapshot.securityDeposit} paid=${snapshot.amountPaid} due=${snapshot.amountDue} refund_amt=${refundAmt} refund_status=${refundStatus} damage=${damage} stage=${stage}]`;
}

export function parseSelfDrivePaymentMarker(
  instructions?: string | null
): Partial<SelfDrivePaymentSnapshot> | null {
  const match = String(instructions ?? "").match(SD_PAYMENT_MARKER);
  if (!match) return null;
  return {
    tripFare: Number(match[1]),
    advanceAmount: Number(match[2]),
    balanceAmount: Number(match[3]),
    securityDeposit: Number(match[4]),
    amountPaid: Number(match[5]),
    amountDue: Number(match[6]),
    depositRefundAmount: Number(match[7] ?? 0),
    depositRefundStatus: (match[8] as DepositRefundStatus) ?? "none",
    damageCharges: Number(match[9] ?? 0),
    operationalStage: (match[10] as SelfDriveOperationalStage) ?? "none",
  };
}

export function parseSelfDriveOperationalStage(instructions?: string | null): SelfDriveOperationalStage {
  const fromPay = parseSelfDrivePaymentMarker(instructions);
  if (fromPay?.operationalStage && fromPay.operationalStage !== "none") {
    return fromPay.operationalStage;
  }
  const stageMatch = String(instructions ?? "").match(SD_STAGE_MARKER);
  if (stageMatch?.[1]) {
    const stage = stageMatch[1].toLowerCase() as SelfDriveOperationalStage;
    if (SELF_DRIVE_OPERATIONAL_STAGES.includes(stage)) return stage;
  }
  return "none";
}

export function stripSelfDrivePaymentMarker(instructions?: string | null): string {
  return String(instructions ?? "")
    .replace(SD_PAYMENT_MARKER, "")
    .replace(SD_STAGE_MARKER, "")
    .trim();
}

export function appendSelfDrivePaymentMarker(
  instructions: string | null | undefined,
  snapshot: SelfDrivePaymentSnapshot
): string {
  const base = stripSelfDrivePaymentMarker(stripProtectionMarker(instructions));
  const marker = encodeSelfDrivePaymentMarker(snapshot);
  return base ? `${base}\n${marker}` : marker;
}

export function appendSelfDriveOperationalStage(
  instructions: string | null | undefined,
  stage: SelfDriveOperationalStage,
  snapshot?: SelfDrivePaymentSnapshot | null
): string {
  if (snapshot) {
    return appendSelfDrivePaymentMarker(instructions, { ...snapshot, operationalStage: stage });
  }
  const base = stripSelfDrivePaymentMarker(stripProtectionMarker(instructions));
  const marker = `[rydez:sd_stage ${stage}]`;
  return base ? `${base}\n${marker}` : marker;
}

type BookingRow = Record<string, unknown>;

function num(row: BookingRow, key: string, fallback = 0): number {
  const v = Number(row[key] ?? fallback);
  return Number.isFinite(v) ? v : fallback;
}

/** Merge DB columns + instruction marker into a single payment snapshot. */
export function deriveSelfDrivePaymentSnapshot(row: BookingRow): SelfDrivePaymentSnapshot | null {
  if (String(row.booking_type ?? "").toLowerCase() !== "self_drive") return null;

  const fromMarker = parseSelfDrivePaymentMarker(String(row.special_instructions ?? ""));
  const tripFare = num(row, "trip_fare_amount") || fromMarker?.tripFare || num(row, "amount");
  const securityDeposit =
    num(row, "security_deposit_amount") || fromMarker?.securityDeposit || 0;

  const advanceAmount =
    num(row, "advance_amount") ||
    fromMarker?.advanceAmount ||
    getAdvancePaymentAmount(tripFare, "advance");

  const balanceAmount =
    num(row, "balance_amount") ||
    fromMarker?.balanceAmount ||
    Math.max(0, tripFare - advanceAmount);

  const amountPaid = num(row, "amount_paid") || fromMarker?.amountPaid || 0;
  const amountDue =
    num(row, "amount_due") || fromMarker?.amountDue || Math.max(0, balanceAmount);

  const depositRefundAmount =
    num(row, "deposit_refund_amount") || fromMarker?.depositRefundAmount || 0;
  const depositRefundStatus = (
    String(row.deposit_refund_status ?? fromMarker?.depositRefundStatus ?? "none").toLowerCase()
  ) as DepositRefundStatus;

  const operationalStage =
    fromMarker?.operationalStage ??
    parseSelfDriveOperationalStage(String(row.special_instructions ?? ""));

  return {
    tripFare,
    advanceAmount,
    balanceAmount,
    securityDeposit,
    amountPaid,
    amountDue,
    depositRefundAmount,
    depositRefundStatus,
    damageCharges: fromMarker?.damageCharges ?? 0,
    operationalStage,
  };
}

export function isSelfDriveBooking(row: { booking_type?: string | null }): boolean {
  return String(row.booking_type ?? "").toLowerCase() === "self_drive";
}

export function standardPaymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Payment Pending",
    partial: "Partially Paid",
    paid: "Paid",
    refunded: "Refunded",
    payment_pending: "Payment Pending",
    payment_completed: "Paid",
    failed: "Failed",
  };
  return map[status.toLowerCase()] ?? status;
}

export function selfDriveBookingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Booking Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return map[status.toLowerCase()] ?? status;
}

/** Human-readable self-drive payment stage from amounts + standard payment_status. */
export function selfDriveWorkflowLabel(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): string {
  const payment = paymentStatus.toLowerCase();
  if (payment === BOOKING_PAYMENT_STATUS.REFUNDED || snapshot.depositRefundStatus === "refunded") {
    return "Deposit Refunded";
  }
  if (snapshot.depositRefundStatus === "processing" || snapshot.depositRefundStatus === "pending") {
    return "Deposit Refund Processing";
  }
  if (selfDriveIsFullyPaid(payment, snapshot)) {
    return "Fully Paid";
  }
  if (selfDriveRequiresBalancePayment(payment, snapshot)) {
    return "Balance Payment Pending";
  }
  if (selfDriveAdvanceCollected(snapshot)) {
    return "Advance Paid";
  }
  return "Advance Payment Pending";
}

export function selfDriveAdvanceCollected(snapshot: SelfDrivePaymentSnapshot): boolean {
  return snapshot.amountPaid >= snapshot.advanceAmount + snapshot.securityDeposit;
}

export function selfDriveIsFullyPaid(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  const payment = paymentStatus.toLowerCase();
  if (payment === BOOKING_PAYMENT_STATUS.PAID || payment === BOOKING_PAYMENT_STATUS.REFUNDED) {
    return true;
  }
  return snapshot.amountDue <= 0 && snapshot.amountPaid > 0;
}

export function selfDriveRequiresBalancePayment(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  const payment = paymentStatus.toLowerCase();
  if (payment !== BOOKING_PAYMENT_STATUS.PARTIAL) return false;
  return snapshot.amountDue > 0;
}

export function selfDriveNeedsInitialPayment(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  const payment = paymentStatus.toLowerCase();
  if (payment === BOOKING_PAYMENT_STATUS.PENDING) return true;
  return snapshot.amountPaid <= 0;
}

export function selfDriveNeedsPayment(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  if (selfDriveIsFullyPaid(paymentStatus, snapshot)) return false;
  return (
    selfDriveNeedsInitialPayment(paymentStatus, snapshot) ||
    selfDriveRequiresBalancePayment(paymentStatus, snapshot)
  );
}

export function selfDriveAllowsVehicleHandover(
  paymentStatus: string,
  bookingStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  if (!selfDriveIsFullyPaid(paymentStatus, snapshot)) return false;
  return bookingStatus.toLowerCase() === "confirmed";
}

export function selfDriveAllowsTripStart(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): boolean {
  if (!selfDriveIsFullyPaid(paymentStatus, snapshot)) return false;
  return snapshot.operationalStage === "handed_over";
}

export function selfDriveProgressState(
  paymentStatus: string,
  snapshot: SelfDrivePaymentSnapshot
): {
  advancePaid: boolean;
  balancePaid: boolean;
  depositHeld: boolean;
  depositRefunded: boolean;
} {
  const advancePaid = selfDriveAdvanceCollected(snapshot);
  const balancePaid = selfDriveIsFullyPaid(paymentStatus, snapshot);
  const depositHeld =
    balancePaid &&
    snapshot.depositRefundStatus === "none" &&
    paymentStatus.toLowerCase() !== BOOKING_PAYMENT_STATUS.REFUNDED;
  const depositRefunded =
    snapshot.depositRefundStatus === "refunded" ||
    paymentStatus.toLowerCase() === BOOKING_PAYMENT_STATUS.REFUNDED;

  return { advancePaid, balancePaid, depositHeld, depositRefunded };
}

/** @deprecated Use selfDriveWorkflowLabel or standardPaymentStatusLabel */
export function selfDrivePaymentStatusLabel(status: string): string {
  return standardPaymentStatusLabel(status);
}

/** @deprecated Use selfDriveWorkflowLabel */
export function selfDriveStatusLabel(status: string): string {
  return standardPaymentStatusLabel(status);
}
