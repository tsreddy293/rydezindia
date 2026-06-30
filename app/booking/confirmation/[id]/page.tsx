import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import BookingPageLayout from "@/components/layout/BookingPageLayout";
import Button from "@/components/ui/Button";
import BookingInvoiceCard from "@/components/booking/BookingInvoiceCard";
import CancellationDetailsCard from "@/components/booking/CancellationDetailsCard";
import ReviewForm from "@/components/reviews/ReviewForm";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { assertRiderBookingAccess } from "@/lib/auth/booking-access";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";
import ConfirmationPendingPayment from "@/components/booking/ConfirmationPendingPayment";
import SelfDrivePaymentProgressCard from "@/components/booking/SelfDrivePaymentProgressCard";
import SelfDriveVerifiedOwner from "@/components/booking/SelfDriveVerifiedOwner";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import { deriveSelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";
import { selfDriveNeedsPayment } from "@/lib/bookings/self-drive-payment-ui";

export const dynamic = "force-dynamic";

function isLegacyPendingPayment(paymentStatus?: string | null): boolean {
  const status = String(paymentStatus ?? "").toLowerCase();
  return !status || status === "pending";
}

function bookingNeedsPayment(booking: NonNullable<Awaited<ReturnType<typeof getBookingConfirmationById>>>): boolean {
  if (booking.booking_type === "self_drive") {
    return selfDriveNeedsPayment(booking as unknown as Record<string, unknown>);
  }
  return isLegacyPendingPayment(booking.payment_status);
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { id } = await params;
  const returnPath = `/booking/confirmation/${id}`;

  const { user } = await requireRiderForBooking(returnPath);

  const booking = await getBookingConfirmationById(id);

  assertRiderBookingAccess(booking, user.id);

  const isCancelled = isBookingCancelledStatus(booking.booking_status);
  const paymentPending = !isCancelled && bookingNeedsPayment(booking);
  const isSelfDrive = booking.booking_type === "self_drive";
  const selfDriveSnapshot = isSelfDrive
    ? deriveSelfDrivePaymentSnapshot(booking as unknown as Record<string, unknown>)
    : null;
  const showReview =
    !isCancelled &&
    !paymentPending &&
    (booking.booking_status === "completed" || booking.booking_status === "confirmed");

  const totalFare = Number(booking.trip_fare_amount ?? booking.amount ?? 0);

  return (
    <BookingPageLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6 space-y-8">
        <div className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center shadow-sm">
          {isCancelled ? (
            <XCircle className="mx-auto mb-5 h-16 w-16 text-red-500" />
          ) : (
            <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-green-500" />
          )}
          <h1 className="text-3xl font-bold text-secondary">
            {isCancelled
              ? "Booking Cancelled"
              : isSelfDrive && booking.booking_status === "confirmed"
                ? "Booking Confirmed"
                : paymentPending
                  ? "Complete Payment"
                  : "Booking Request Confirmed"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isCancelled
              ? "This booking has been cancelled."
              : isSelfDrive && booking.booking_status === "confirmed" && selfDriveSnapshot
                ? "Your self-drive booking is confirmed. Pay the remaining balance before pickup."
                : paymentPending
                  ? "Payment is required to confirm your booking."
                  : "Your request has been received by Rydez India."}
          </p>

          <div className="mt-8">
            <BookingInvoiceCard booking={booking} />
          </div>

          {isSelfDrive && selfDriveSnapshot && !isCancelled && (
            <div className="mt-8 text-left">
              <SelfDrivePaymentProgressCard
                bookingStatus={booking.booking_status}
                paymentStatus={booking.payment_status}
                snapshot={selfDriveSnapshot}
                pickupDate={booking.pickup_date}
              />
            </div>
          )}

          {isSelfDrive && !isCancelled && !paymentPending && (
            <div className="mt-6 text-left">
              <SelfDriveVerifiedOwner bookingId={booking.id} revealContact />
            </div>
          )}

          {paymentPending && (
            <div className="mt-8 text-left">
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
          )}

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
    </BookingPageLayout>
  );
}
