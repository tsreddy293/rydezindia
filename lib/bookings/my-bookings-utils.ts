/** Helpers for the My Bookings dashboard module. */

export function parseReturnScheduleFromInstructions(text?: string | null): {
  returnDate?: string;
  returnTime?: string;
} {
  if (!text?.trim()) return {};
  const dateMatch = text.match(/Return date:\s*(\d{4}-\d{2}-\d{2})/i);
  const timeMatch = text.match(/Return time:\s*(\d{1,2}:\d{2})/i);
  return {
    returnDate: dateMatch?.[1],
    returnTime: timeMatch?.[1],
  };
}

export function isTripStartReached(
  pickupDate?: string | null,
  pickupTime?: string | null,
  reference: Date = new Date()
): boolean {
  if (!pickupDate?.trim()) return false;
  const time = (pickupTime?.trim() || "00:00").slice(0, 5);
  const start = new Date(`${pickupDate.trim()}T${time}:00`);
  if (Number.isNaN(start.getTime())) return false;
  return reference.getTime() >= start.getTime();
}

export function canCustomerCancelBooking(input: {
  bookingStatus: string;
  cancellationStatus?: string | null;
  pickupDate?: string | null;
  pickupTime?: string | null;
}): boolean {
  const status = input.bookingStatus.toLowerCase();
  const cancelled =
    input.cancellationStatus === "cancelled" || status === "cancelled";
  if (cancelled) return false;
  if (status !== "confirmed") return false;
  if (isTripStartReached(input.pickupDate, input.pickupTime)) return false;
  return true;
}

export function formatBookingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    self_drive: "Self Drive",
    with_driver: "With Driver",
    return_journey: "Return Journey",
    local_rental: "Local Rental",
  };
  return labels[type.toLowerCase()] ?? type.replace(/_/g, " ");
}

export function formatBookingStatusLabel(status: string): string {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    active: "Trip Started",
    completed: "Completed",
    cancelled: "Cancelled",
    approved: "Approved",
    paid: "Paid",
  };
  return labels[key] ?? status.replace(/_/g, " ");
}

export function formatPaymentStatusLabel(status: string): string {
  const key = status.toLowerCase();
  const labels: Record<string, string> = {
    pending: "Payment Pending",
    paid: "Paid",
    partial: "Partially Paid",
    refunded: "Refunded",
    failed: "Failed",
  };
  return labels[key] ?? status.replace(/_/g, " ");
}

export function formatRefundStatusLabel(status: string): string {
  const key = status.toLowerCase();
  if (key === "pending" || key === "processing") return "Processing";
  if (key === "approved") return "Approved";
  if (key === "refunded") return "Completed";
  if (key === "rejected") return "Rejected";
  return status.replace(/_/g, " ");
}

export function resolveVehicleImage(row: Record<string, unknown> | null | undefined): string | null {
  if (!row) return null;
  const photoUrl = row.vehicle_photo_url;
  if (typeof photoUrl === "string" && photoUrl.trim()) return photoUrl;
  const photos = row.photos;
  if (Array.isArray(photos) && photos[0]) return String(photos[0]);
  return null;
}

export function formatScheduleLine(date?: string, time?: string): string {
  if (!date) return "—";
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${formatted} · ${time.slice(0, 5)}` : formatted;
}

export type BookingFilterTab = "all" | "active" | "completed" | "cancelled";

export function filterBookingsByTab<T extends { booking_status: string; cancellation_status?: string | null }>(
  bookings: T[],
  tab: BookingFilterTab
): T[] {
  if (tab === "all") return bookings;
  if (tab === "cancelled") {
    return bookings.filter(
      (b) =>
        b.cancellation_status === "cancelled" || b.booking_status.toLowerCase() === "cancelled"
    );
  }
  if (tab === "completed") {
    return bookings.filter((b) => b.booking_status.toLowerCase() === "completed");
  }
  return bookings.filter((b) => {
    const status = b.booking_status.toLowerCase();
    return (
      status !== "cancelled" &&
      status !== "completed" &&
      b.cancellation_status !== "cancelled"
    );
  });
}
