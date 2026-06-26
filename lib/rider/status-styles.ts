/** Rider status badge color system. */

export type RiderStatusKind = "active" | "upcoming" | "pending" | "cancelled" | "completed";

export const RIDER_STATUS_STYLES: Record<RiderStatusKind, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  upcoming: "bg-blue-100 text-blue-800 ring-blue-600/20",
  pending: "bg-orange-100 text-orange-800 ring-orange-600/20",
  cancelled: "bg-red-100 text-red-800 ring-red-600/20",
  completed: "bg-gray-100 text-gray-700 ring-gray-500/20",
};

export function resolveBookingStatusKind(
  bookingStatus: string,
  paymentStatus?: string,
  pickupDate?: string | null
): RiderStatusKind {
  const status = bookingStatus.toLowerCase();
  if (status === "cancelled" || status === "already_cancelled") return "cancelled";
  if (status === "completed") return "completed";
  if (status === "pending" || paymentStatus?.toLowerCase() === "pending") return "pending";

  if (status === "confirmed" && pickupDate) {
    const pickup = new Date(pickupDate);
    if (!Number.isNaN(pickup.getTime()) && pickup.getTime() > Date.now()) {
      return "upcoming";
    }
    return "active";
  }

  if (status === "confirmed") return "active";
  return "pending";
}

export function statusKindLabel(kind: RiderStatusKind): string {
  const labels: Record<RiderStatusKind, string> = {
    active: "Active",
    upcoming: "Upcoming",
    pending: "Pending",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  return labels[kind];
}
