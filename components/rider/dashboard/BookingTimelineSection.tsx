import BookingTimeline from "@/components/booking/BookingTimeline";
import type { RiderDashboardBooking } from "@/lib/rider/dashboard-types";

export default function BookingTimelineSection({
  booking,
}: {
  booking: RiderDashboardBooking | null;
}) {
  if (!booking) return null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-secondary">Booking Timeline</h2>
      <p className="mb-3 text-sm text-gray-500">
        {booking.bookingReference} · {booking.bookingType.replace(/_/g, " ")}
      </p>
      <BookingTimeline
        bookingStatus={booking.bookingStatus}
        paymentStatus={booking.paymentStatus}
        cancellationStatus={booking.cancellationStatus}
        cancelledByRole={booking.cancelledByRole}
        refundStatus={booking.refundStatus}
        createdAt={booking.createdAt}
        cancelledAt={booking.cancelledAt}
      />
      {booking.bookingStatus.toLowerCase() !== "cancelled" && (
        <p className="mt-3 text-xs text-gray-400">
          Timeline updates as your trip progresses from booking to completion.
        </p>
      )}
    </section>
  );
}
