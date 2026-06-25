import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import {
  canGenerateTaxInvoice,
  isCancelledStatus,
  isPaymentCompleted,
} from "@/lib/bookings/invoice-access";
import { FLEXIBLE_PROTECTION_NAME } from "@/lib/services/flexible-cancellation-protection";
import { formatDate, formatINR } from "@/lib/utils";
import type { BookingConfirmation } from "@/types/database";

interface Props {
  booking: BookingConfirmation;
}

export default function BookingInvoiceCard({ booking }: Props) {
  const protectionFee =
    booking.protection_fee ?? booking.flexible_cancellation_fee ?? 0;
  const tripFare = booking.trip_fare_amount ?? Math.max(0, booking.amount - protectionFee);
  const deposit = booking.security_deposit_amount ?? 0;
  const protected_ = Boolean(booking.protection_selected || booking.flexible_cancellation);
  const paid = isPaymentCompleted(booking.payment_status);
  const cancelled = isCancelledStatus(booking.booking_status, booking.cancellation_status);
  const canDownloadInvoice = canGenerateTaxInvoice({
    paymentStatus: booking.payment_status,
    bookingStatus: booking.booking_status,
    cancellationStatus: booking.cancellation_status,
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden text-left">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-secondary">Booking Invoice</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {booking.booking_reference ?? booking.id} · {formatDate(booking.created_at)}
          </p>
        </div>
        {canDownloadInvoice || (cancelled && paid) ? (
          <Link
            href={`/booking/invoice/${booking.id}`}
            className="text-xs font-semibold text-primary hover:underline"
            target="_blank"
          >
            Download / Print PDF
          </Link>
        ) : (
          <span className="text-xs font-medium text-gray-500">
            Invoice will be available after successful payment.
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-0 text-sm">
        <div className="flex justify-between border-b border-gray-100 py-2.5">
          <span className="text-gray-500">Passenger</span>
          <span className="font-medium text-secondary text-right">{booking.passenger_name}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 py-2.5">
          <span className="text-gray-500">Booking type</span>
          <span className="font-medium text-secondary capitalize">
            {String(booking.booking_type).replace(/_/g, " ")}
          </span>
        </div>
        {booking.pickup_location && (
          <div className="flex justify-between border-b border-gray-100 py-2.5 gap-4">
            <span className="text-gray-500 shrink-0">Route</span>
            <span className="font-medium text-secondary text-right">
              {booking.pickup_location}
              {booking.drop_location ? ` → ${booking.drop_location}` : ""}
            </span>
          </div>
        )}
        {booking.pickup_date && (
          <div className="flex justify-between border-b border-gray-100 py-2.5">
            <span className="text-gray-500">Pickup</span>
            <span className="font-medium text-secondary">
              {formatDate(booking.pickup_date)}
              {booking.pickup_time ? ` · ${booking.pickup_time}` : ""}
            </span>
          </div>
        )}

        <div className="pt-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fare breakdown</p>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-600">Trip fare</span>
          <span className="font-medium">{formatINR(Math.max(0, tripFare))}</span>
        </div>
        {deposit > 0 && (
          <div className="flex justify-between py-2 text-gray-600">
            <span>Refundable deposit</span>
            <span>{formatINR(deposit)}</span>
          </div>
        )}
        {protected_ && protectionFee > 0 && (
          <div className="flex justify-between py-2">
            <span className="text-gray-600 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              {FLEXIBLE_PROTECTION_NAME}
            </span>
            <span className="font-medium text-emerald-700">{formatINR(protectionFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 py-3 mt-1">
          <span className="font-semibold text-secondary">Amount payable online</span>
          <span className="text-lg font-bold text-primary">{formatINR(booking.amount)}</span>
        </div>

        {protected_ && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-secondary">🛡 {FLEXIBLE_PROTECTION_NAME}</p>
                {booking.protection_plan_name && (
                  <p className="text-xs text-gray-500 mt-0.5">{booking.protection_plan_name}</p>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-bold uppercase text-emerald-700">
                      {(booking.protection_status ?? "active").toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Plan fee</p>
                    <p className="font-bold text-secondary">{formatINR(protectionFee)}</p>
                  </div>
                </div>
                {booking.protection_purchase_date && (
                  <p className="text-xs text-gray-500 mt-2">
                    Purchased {formatDate(booking.protection_purchase_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 mt-2">
          <span className="text-gray-500">Cancellation policy</span>
          <ProtectionStatusBadge selected={protected_} fee={protectionFee || undefined} />
        </div>

        <div className="flex justify-between border-t border-gray-100 pt-3 mt-2">
          <span className="text-gray-500">Payment status</span>
          <span className="font-medium capitalize">{booking.payment_status}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-500">Booking status</span>
          <span className="font-medium capitalize">{booking.booking_status}</span>
        </div>
        {!paid && !cancelled && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            Invoice will be available after successful payment. Continue to payment from the booking confirmation page.
          </div>
        )}
        {cancelled && !paid && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-900">
            Booking Cancelled - No Payment Received.
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 mt-2 text-xs text-gray-500 space-y-1">
          <p>
            <span className="font-medium text-gray-700">Flexible Cancellation Protection:</span>{" "}
            {protected_ ? "YES" : "NO"}
          </p>
          {protected_ && (
            <p>
              <span className="font-medium text-gray-700">Plan Fee:</span> {formatINR(protectionFee)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
