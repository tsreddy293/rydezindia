import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import BookingInvoiceCard from "@/components/booking/BookingInvoiceCard";
import CancellationDetailsCard from "@/components/booking/CancellationDetailsCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { assertRiderBookingAccess } from "@/lib/auth/booking-access";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params;
  const returnPath = `/booking/confirmation/${id}`;

  const { user } = await requireRiderForBooking(returnPath);

  const booking = await getBookingConfirmationById(id);

  assertRiderBookingAccess(booking, user.id);

  const isCancelled = isBookingCancelledStatus(booking.booking_status, booking.cancellation_status);
  const showReview =
    !isCancelled && (booking.booking_status === "completed" || booking.booking_status === "confirmed");

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6 space-y-8">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center shadow-sm">
          {isCancelled ? (
            <XCircle className="mx-auto mb-5 h-16 w-16 text-red-500" />
          ) : (
            <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-green-500" />
          )}
          <h1 className="text-3xl font-bold text-secondary">
            {isCancelled ? "Booking Cancelled" : "Booking Request Confirmed"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isCancelled
              ? "This booking has been cancelled."
              : "Your request has been received by Rydez India."}
          </p>

          <div className="mt-8">
            <BookingInvoiceCard booking={booking} />
          </div>

          {isCancelled && (
            <div className="mt-6 text-left">
              <CancellationDetailsCard booking={booking} />
            </div>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/search" variant="primary">Book Another Vehicle</Button>
            <Button href="/dashboard/bookings" variant="outline">My Bookings</Button>
          </div>
        </div>

        {showReview && (
          <ReviewForm
            bookingId={booking.id}
            vehicleId={booking.vehicle_id}
            ownerId={booking.owner_id}
          />
        )}
      </div>
    </PageLayout>
  );
}
