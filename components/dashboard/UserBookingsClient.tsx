"use client";

/**
 * @deprecated Use MyBookingsClient from @/components/dashboard/my-bookings/MyBookingsClient
 * Kept for backward compatibility with existing imports and dev cache.
 */
import MyBookingsClient from "@/components/dashboard/my-bookings/MyBookingsClient";
import type { MyBookingRecord, UserBookingExtended } from "@/types/database";

interface Props {
  bookings: MyBookingRecord[] | UserBookingExtended[];
  refundHistory?: UserBookingExtended[];
}

export default function UserBookingsClient({ bookings }: Props) {
  return <MyBookingsClient bookings={bookings as MyBookingRecord[]} />;
}
