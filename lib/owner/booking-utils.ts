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
}

export function mapOwnerBooking(b: UserBooking): OwnerBookingRow {
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
  };
}

export function categorizeBooking(b: OwnerBookingRow): BookingTab[] {
  const status = b.bookingStatus.toLowerCase();
  const tabs: BookingTab[] = [];
  if (status === "cancelled") {
    tabs.push("cancelled");
    if (b.paymentStatus.toLowerCase() === "refunded" || b.refundStatus) tabs.push("refunds");
    return tabs;
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
        b.bookingStatus.toLowerCase() === "cancelled" &&
        (b.paymentStatus.toLowerCase().includes("refund") || Boolean(b.refundStatus))
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
