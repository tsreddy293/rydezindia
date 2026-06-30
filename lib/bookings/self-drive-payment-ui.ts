import {
  deriveSelfDrivePaymentSnapshot,
  selfDriveIsFullyPaid,
  selfDriveNeedsInitialPayment,
  selfDriveNeedsPayment as selfDriveBookingNeedsPayment,
  selfDriveRequiresBalancePayment,
  type SelfDrivePaymentSnapshot,
} from "@/lib/bookings/self-drive-payment";

export type SelfDrivePaymentPhase = "initial" | "balance" | "complete";

export function getSelfDrivePaymentPhase(
  booking: { payment_status?: string | null },
  snapshot: SelfDrivePaymentSnapshot
): SelfDrivePaymentPhase {
  const payment = String(booking.payment_status ?? "").toLowerCase();

  if (selfDriveIsFullyPaid(payment, snapshot)) return "complete";

  if (selfDriveRequiresBalancePayment(payment, snapshot)) {
    return "balance";
  }

  if (selfDriveNeedsInitialPayment(payment, snapshot)) {
    return "initial";
  }

  return snapshot.amountDue > 0 ? "balance" : "complete";
}

export function selfDriveNeedsPayment(row: Record<string, unknown>): boolean {
  const snapshot = deriveSelfDrivePaymentSnapshot(row);
  if (!snapshot) return false;
  const payment = String(row.payment_status ?? "").toLowerCase();
  return selfDriveBookingNeedsPayment(payment, snapshot);
}

export function selfDrivePayAmount(
  phase: SelfDrivePaymentPhase,
  snapshot: SelfDrivePaymentSnapshot,
  bookingAmount?: number
): number {
  if (phase === "balance") return snapshot.amountDue;
  if (phase === "initial") {
    return Math.max(0, Number(bookingAmount ?? snapshot.advanceAmount + snapshot.securityDeposit));
  }
  return 0;
}
