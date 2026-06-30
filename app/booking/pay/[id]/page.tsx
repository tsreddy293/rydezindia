import { notFound, redirect } from "next/navigation";
import BookingPageLayout from "@/components/layout/BookingPageLayout";
import ConfirmationPendingPayment from "@/components/booking/ConfirmationPendingPayment";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { assertRiderBookingAccess } from "@/lib/auth/booking-access";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import { deriveSelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";
import { selfDriveNeedsPayment } from "@/lib/bookings/self-drive-payment-ui";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function isPendingPayment(paymentStatus?: string | null): boolean {
  const status = String(paymentStatus ?? "").toLowerCase();
  return !status || status === "pending";
}

function bookingNeedsPayment(booking: NonNullable<Awaited<ReturnType<typeof getBookingConfirmationById>>>): boolean {
  if (booking.booking_type === "self_drive") {
    return selfDriveNeedsPayment(booking as unknown as Record<string, unknown>);
  }
  return isPendingPayment(booking.payment_status);
}

export default async function BookingPayPage({ params }: Props) {
  const { id } = await params;
  const returnPath = `/booking/pay/${id}`;

  const { user } = await requireRiderForBooking(returnPath);
  const booking = await getBookingConfirmationById(id);
  if (!booking) notFound();

  assertRiderBookingAccess(booking, user.id);

  if (isBookingCancelledStatus(booking.booking_status)) {
    redirect(`/booking/confirmation/${id}`);
  }

  if (!bookingNeedsPayment(booking)) {
    redirect(`/booking/confirmation/${id}`);
  }

  const totalFare = Number(booking.trip_fare_amount ?? booking.amount ?? 0);
  const isSelfDrive = booking.booking_type === "self_drive";
  const selfDriveSnapshot = isSelfDrive
    ? deriveSelfDrivePaymentSnapshot(booking as unknown as Record<string, unknown>)
    : null;

  return (
    <BookingPageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold text-secondary mb-2">Complete Payment</h1>
        <p className="text-gray-600 mb-8">
          Booking {booking.booking_reference ?? id.slice(0, 8).toUpperCase()} — payment pending
        </p>
        <ConfirmationPendingPayment
          bookingId={booking.id}
          totalFare={totalFare}
          customerName={booking.passenger_name}
          customerMobile={booking.mobile ?? ""}
          fullPaymentOnly={booking.booking_type === "return_journey"}
          selfDrive={
            isSelfDrive && selfDriveSnapshot
              ? {
                  bookingStatus: booking.booking_status,
                  paymentStatus: booking.payment_status,
                  snapshot: selfDriveSnapshot,
                  pickupDate: booking.pickup_date,
                  bookingAmount: booking.amount,
                }
              : undefined
          }
        />
      </div>
    </BookingPageLayout>
  );
}
