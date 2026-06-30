import {
  deriveSelfDrivePaymentSnapshot,
  selfDriveBookingStatusLabel,
  selfDriveIsFullyPaid,
  selfDriveWorkflowLabel,
  type SelfDrivePaymentSnapshot,
} from "@/lib/bookings/self-drive-payment";
import type { UserBooking } from "@/types/database";

export type BookingTab = "upcoming" | "active" | "completed" | "cancelled" | "refunds";

export interface OwnerBookingRow {
  id: string;
  bookingReference: string;
  passengerName: string;
  passengerMobile?: string;
  bookingType: string;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  createdAt: string;
  refundStatus?: string;
  selfDriveSnapshot?: SelfDrivePaymentSnapshot | null;
}

export interface OwnerSelfDrivePaymentSummary {
  advanceReceived: number;
  depositReceived: number;
  balancePending: number;
  balanceReceived: number;
  depositHeld: number;
  fullyPaid: boolean;
}

export function getOwnerSelfDrivePaymentSummary(row: OwnerBookingRow): OwnerSelfDrivePaymentSummary | null {
  if (row.bookingType.toLowerCase() !== "self_drive" || !row.selfDriveSnapshot) return null;
  const s = row.selfDriveSnapshot;
  const fullyPaid = selfDriveIsFullyPaid(row.paymentStatus, s);
  const advanceCollected = s.amountPaid >= s.advanceAmount + s.securityDeposit || fullyPaid;

  return {
    advanceReceived: advanceCollected ? s.advanceAmount : 0,
    depositReceived: advanceCollected ? s.securityDeposit : 0,
    balancePending: fullyPaid ? 0 : s.amountDue,
    balanceReceived: fullyPaid ? s.balanceAmount : Math.max(0, s.amountPaid - s.advanceAmount - s.securityDeposit),
    depositHeld:
      fullyPaid && s.depositRefundStatus === "none" && row.paymentStatus.toLowerCase() !== "refunded"
        ? s.securityDeposit
        : 0,
    fullyPaid,
  };
}

export function mapOwnerBooking(b: UserBooking): OwnerBookingRow {
  const bookingType = b.booking_type;
  const selfDriveSnapshot =
    bookingType === "self_drive"
      ? deriveSelfDrivePaymentSnapshot(b as unknown as Record<string, unknown>)
      : null;

  return {
    id: b.id,
    bookingReference: b.booking_reference ?? b.id.slice(0, 8).toUpperCase(),
    passengerName: b.passenger_name,
    passengerMobile: b.mobile,
    bookingType: b.booking_type,
    amount: b.amount,
    bookingStatus: b.booking_status,
    paymentStatus: b.payment_status,
    pickupLocation: b.pickup_location,
    dropLocation: b.drop_location,
    pickupDate: b.pickup_date,
    pickupTime: b.pickup_time,
    createdAt: b.created_at,
    refundStatus: b.refund_status ?? undefined,
    selfDriveSnapshot,
  };
}

export function categorizeBooking(b: OwnerBookingRow): BookingTab[] {
  const status = b.bookingStatus.toLowerCase();
  const payment = b.paymentStatus.toLowerCase();
  const tabs: BookingTab[] = [];

  if (status === "cancelled") {
    tabs.push("cancelled");
    if (payment.includes("refund") || b.refundStatus) tabs.push("refunds");
    return tabs;
  }

  if (b.bookingType.toLowerCase() === "self_drive") {
    if (status === "completed" || payment === "refunded") return ["completed"];
    const stage = b.selfDriveSnapshot?.operationalStage;
    if (stage === "trip_started") return ["active"];
    if (stage === "trip_completed" || b.selfDriveSnapshot?.depositRefundStatus === "processing") {
      return ["active", "completed"];
    }
    if (status === "confirmed" || status === "pending") return ["upcoming", "active"];
    return ["upcoming"];
  }

  if (status === "completed") return ["completed"];
  if (["active", "ongoing", "in_progress"].includes(status)) return ["active"];
  if (["pending", "confirmed"].includes(status)) return ["upcoming", "active"];
  return ["upcoming"];
}

export function filterBookingsByTab(bookings: OwnerBookingRow[], tab: BookingTab): OwnerBookingRow[] {
  if (tab === "refunds") {
    return bookings.filter(
      (b) =>
        b.bookingStatus.toLowerCase() === "cancelled" ||
        b.paymentStatus.toLowerCase().includes("refund") ||
        Boolean(b.refundStatus)
    );
  }
  return bookings.filter((b) => categorizeBooking(b).includes(tab));
}

export function tripStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed") return "Completed";
  if (["active", "ongoing"].includes(s)) return "In Progress";
  if (s === "confirmed") return "Confirmed";
  if (s === "pending") return "Awaiting";
  if (s === "cancelled") return "Cancelled";
  return status;
}

export function ownerPaymentStatusLabel(row: OwnerBookingRow): string {
  if (row.bookingType.toLowerCase() === "self_drive" && row.selfDriveSnapshot) {
    return selfDriveWorkflowLabel(row.paymentStatus, row.selfDriveSnapshot);
  }
  return row.paymentStatus;
}

export function ownerBookingStatusLabel(row: OwnerBookingRow): string {
  if (row.bookingType.toLowerCase() === "self_drive") {
    const stage = row.selfDriveSnapshot?.operationalStage;
    if (stage === "handed_over") return "Vehicle Handed Over";
    if (stage === "trip_started") return "Trip In Progress";
    if (stage === "trip_completed") return "Trip Completed";
    return selfDriveBookingStatusLabel(row.bookingStatus);
  }
  return tripStatusLabel(row.bookingStatus);
}
