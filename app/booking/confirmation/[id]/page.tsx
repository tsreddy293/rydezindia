import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import Button from "@/components/ui/Button";
import BookingInvoiceCard from "@/components/booking/BookingInvoiceCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params;
  const returnPath = `/booking/confirmation/${id}`;

  await requireRiderForBooking(returnPath);

  const booking = await getBookingConfirmationById(id);

  if (!booking) notFound();

  const showReview = booking.booking_status === "completed" || booking.booking_status === "confirmed";

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6 space-y-8">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-green-500" />
          <h1 className="text-3xl font-bold text-secondary">Booking Request Confirmed</h1>
          <p className="mt-2 text-gray-600">Your request has been received by Rydez India.</p>

          <div className="mt-8">
            <BookingInvoiceCard booking={booking} />
          </div>

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
