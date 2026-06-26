import { forbidden, notFound } from "next/navigation";

export function assertRiderBookingAccess(
  booking: { user_id?: string | null } | null | undefined,
  userId: string
): asserts booking is { user_id?: string | null } {
  if (!booking) notFound();
  const ownerId = String(booking.user_id ?? "").trim();
  if (ownerId && ownerId !== userId) forbidden();
}
