import { isOwnerClosedBooking } from "@/lib/owner/booking-eligibility";

export type OwnerVehicleStatusKind = "active" | "booked" | "pending" | "cancelled" | "disabled";

export const OWNER_STATUS_STYLES: Record<OwnerVehicleStatusKind, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  booked: "bg-blue-100 text-blue-800 ring-blue-600/20",
  pending: "bg-orange-100 text-orange-800 ring-orange-600/20",
  cancelled: "bg-red-100 text-red-800 ring-red-600/20",
  disabled: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

export function resolveVehicleStatusKind(
  approvalStatus: string,
  isActive?: boolean
): OwnerVehicleStatusKind {
  const status = approvalStatus.toLowerCase();
  if (status === "rejected" || status === "cancelled") return "cancelled";
  if (status === "pending") return "pending";
  if (isActive === false) return "disabled";
  if (status === "approved") return "active";
  return "pending";
}

export function resolveBookingStatusKind(status: string, paymentStatus?: string): OwnerVehicleStatusKind {
  const s = status.toLowerCase();
  if (isOwnerClosedBooking({ bookingStatus: status, paymentStatus })) return "cancelled";
  if (s === "confirmed" || s === "active") return "booked";
  if (s === "completed") return "active";
  if (paymentStatus?.toLowerCase() === "pending") return "pending";
  return "pending";
}
