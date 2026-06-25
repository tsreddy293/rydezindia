/** Rules for counting booking amounts toward platform revenue. */

export type RevenueBookingRow = {
  amount?: number | string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  refund_status?: string | null;
  cancellation_status?: string | null;
  created_at?: string | null;
};

const CANCELLED_BOOKING_STATUSES = new Set(["cancelled", "already_cancelled"]);

function normalize(value: string | null | undefined): string {
  return String(value ?? "").toLowerCase().trim();
}

export function isCancelledBookingRow(row: RevenueBookingRow): boolean {
  const bookingStatus = normalize(row.booking_status);
  const cancellationStatus = normalize(row.cancellation_status);
  return CANCELLED_BOOKING_STATUSES.has(bookingStatus) || cancellationStatus === "cancelled";
}

/** Include in revenue only: paid, not cancelled, not refunded. */
export function countsTowardRevenue(row: RevenueBookingRow): boolean {
  if (normalize(row.payment_status) !== "paid") return false;
  if (isCancelledBookingRow(row)) return false;
  if (normalize(row.refund_status) === "refunded") return false;
  return true;
}

export function bookingRevenueAmount(row: RevenueBookingRow): number {
  if (!countsTowardRevenue(row)) return 0;
  const amount = Number(row.amount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function filterRevenueEligibleBookings<T extends RevenueBookingRow>(rows: T[]): T[] {
  return rows.filter(countsTowardRevenue);
}

export function sumBookingRevenue(rows: RevenueBookingRow[]): number {
  return rows.reduce((sum, row) => sum + bookingRevenueAmount(row), 0);
}

export function sumBookingRevenueSince(rows: RevenueBookingRow[], since: Date): number {
  return rows.reduce((sum, row) => {
    if (!row.created_at) return sum;
    const created = new Date(String(row.created_at));
    if (Number.isNaN(created.getTime()) || created < since) return sum;
    return sum + bookingRevenueAmount(row);
  }, 0);
}

export function sumProtectionRevenue(
  rows: RevenueBookingRow[],
  feeForRow: (row: RevenueBookingRow) => number
): number {
  return rows.reduce((sum, row) => {
    if (!countsTowardRevenue(row)) return sum;
    const fee = Number(feeForRow(row) ?? 0);
    return sum + (Number.isFinite(fee) && fee > 0 ? fee : 0);
  }, 0);
}
