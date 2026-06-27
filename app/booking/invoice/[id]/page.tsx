import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { assertRiderBookingAccess } from "@/lib/auth/booking-access";
import { requireRiderForBooking } from "@/lib/auth/customer-auth";
import { getBookingConfirmationById } from "@/lib/supabase/queries";
import { FLEXIBLE_PROTECTION_NAME } from "@/lib/services/flexible-cancellation-protection";
import { formatDate, formatINR } from "@/lib/utils";
import BookingInvoicePrintButton from "@/components/booking/BookingInvoicePrintButton";
import {
  canGenerateTaxInvoice,
  isCancelledStatus,
  isPaymentCompleted,
} from "@/lib/bookings/invoice-access";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingInvoicePage({ params }: Props) {
  const { id } = await params;
  const { user } = await requireRiderForBooking(`/booking/invoice/${id}`);
  const booking = await getBookingConfirmationById(id);
  assertRiderBookingAccess(booking, user.id);

  const paid = isPaymentCompleted(booking.payment_status);
  const cancelled = isCancelledStatus(booking.booking_status);
  const canGenerateInvoice = canGenerateTaxInvoice({
    paymentStatus: booking.payment_status,
    bookingStatus: booking.booking_status,
  });
  const isCancelledAfterPayment = cancelled && paid;
  const isCancelledBeforePayment = cancelled && !paid;

  if (!canGenerateInvoice && !isCancelledAfterPayment && !isCancelledBeforePayment) {
    forbidden();
  }

  const protectionFee = booking.protection_fee ?? 0;
  const tripFare = booking.trip_fare_amount ?? Math.max(0, booking.amount - protectionFee);
  const deposit = booking.security_deposit_amount ?? 0;
  const protected_ = Boolean(booking.protection_selected);
  const refundableDeposit = booking.refund_deposit_amount ?? 0;
  const refundAmount = booking.refund_amount ?? 0;
  const cancellationCharges = booking.cancellation_charges ?? 0;

  return (
    <div className="min-h-screen bg-white text-secondary print:bg-white">
      <div className="mx-auto max-w-2xl px-6 py-10 print:py-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 print:mb-6">
          <div>
            <p className="text-2xl font-bold text-primary">Rydez India</p>
            <p className="text-sm text-gray-500">Vehicle Sharing · Self Drive</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">
              {isCancelledAfterPayment
                ? "CANCELLATION RECEIPT"
                : canGenerateInvoice
                  ? "TAX INVOICE / RECEIPT"
                  : "PAYMENT PENDING"}
            </p>
            <p className="text-gray-500">{booking.booking_reference ?? booking.id}</p>
            <p className="text-gray-500">{formatDate(booking.created_at)}</p>
          </div>
        </div>

        {isCancelledBeforePayment && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">
            Booking Cancelled - No Payment Received.
          </div>
        )}

        {!paid && !cancelled && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Invoice will be available after successful payment.
            </p>
            <Link
              href={`/booking/confirmation/${booking.id}`}
              className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Continue to Payment
            </Link>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-gray-200 p-5 print:border-gray-300">
          <h1 className="text-lg font-bold mb-4">Booking Summary</h1>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Passenger</td>
                <td className="py-2 text-right font-medium">{booking.passenger_name}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Mobile</td>
                <td className="py-2 text-right font-medium">{booking.mobile}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Trip fare</td>
                <td className="py-2 text-right font-medium">{formatINR(tripFare)}</td>
              </tr>
              {deposit > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">Refundable deposit</td>
                  <td className="py-2 text-right font-medium">{formatINR(deposit)}</td>
                </tr>
              )}
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-500">Amount paid online</td>
                <td className="py-2 text-right font-bold text-primary">{formatINR(booking.amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {isCancelledAfterPayment && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/40 p-5 print:border-gray-300 print:bg-white">
            <h2 className="mb-3 font-bold">Refund & Cancellation</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-rose-100">
                  <td className="py-2 text-gray-600">Refund amount</td>
                  <td className="py-2 text-right font-semibold">{formatINR(refundAmount)}</td>
                </tr>
                <tr className="border-b border-rose-100">
                  <td className="py-2 text-gray-600">Cancellation charges</td>
                  <td className="py-2 text-right font-semibold">{formatINR(cancellationCharges)}</td>
                </tr>
                <tr className="border-b border-rose-100">
                  <td className="py-2 text-gray-600">Protection plan fee</td>
                  <td className="py-2 text-right font-semibold">{formatINR(protectionFee)}</td>
                </tr>
                <tr className="border-b border-rose-100">
                  <td className="py-2 text-gray-600">Refundable deposit</td>
                  <td className="py-2 text-right font-semibold">{formatINR(refundableDeposit)}</td>
                </tr>
                <tr className="border-b border-rose-100">
                  <td className="py-2 text-gray-600">Refund status</td>
                  <td className="py-2 text-right font-semibold uppercase">
                    {booking.refund_status ?? "pending"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Refund transaction ID</td>
                  <td className="py-2 text-right font-semibold">
                    {booking.refund_transaction_id ?? "Pending"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 print:border-gray-300 print:bg-white">
          <h2 className="font-bold mb-3">🛡 {FLEXIBLE_PROTECTION_NAME}</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-emerald-100">
                <td className="py-2 text-gray-600">Flexible Cancellation Protection</td>
                <td className="py-2 text-right font-bold">{protected_ ? "YES" : "NO"}</td>
              </tr>
              {protected_ && (
                <>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 text-gray-600">Plan</td>
                    <td className="py-2 text-right font-medium">{booking.protection_plan_name ?? "—"}</td>
                  </tr>
                  <tr className="border-b border-emerald-100">
                    <td className="py-2 text-gray-600">Status</td>
                    <td className="py-2 text-right font-bold uppercase text-emerald-700">
                      {booking.protection_status ?? "ACTIVE"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-600">Plan Fee</td>
                    <td className="py-2 text-right font-bold">{formatINR(protectionFee)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 print:mt-8">
          Protection fee is non-refundable. Refundable deposit handled separately per Rydez India policy.
          This document is computer-generated and valid without signature.
        </p>

        <div className="mt-8 print:hidden flex flex-wrap gap-3">
          {(canGenerateInvoice || isCancelledAfterPayment) && (
            <>
              <BookingInvoicePrintButton />
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `${isCancelledAfterPayment ? "Cancellation Receipt" : "Tax Invoice"} - ${
                    booking.booking_reference ?? booking.id
                  }`
                )}&body=${encodeURIComponent(
                  `Please find your ${isCancelledAfterPayment ? "cancellation receipt" : "tax invoice"} at ${`${
                    process.env.NEXT_PUBLIC_SITE_URL ?? ""
                  }/booking/invoice/${booking.id}`}`
                )}`}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-secondary hover:bg-gray-50"
              >
                Email Invoice
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
