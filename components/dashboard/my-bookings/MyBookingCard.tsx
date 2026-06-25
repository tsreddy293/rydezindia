"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  MapPin,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { useState } from "react";
import Button from "@/components/ui/Button";
import CancelBookingButton from "@/components/booking/CancelBookingButton";
import BookingTimeline from "@/components/booking/BookingTimeline";
import ProtectionStatusBadge from "@/components/booking/ProtectionStatusBadge";
import BookingStatusBadge from "@/components/dashboard/my-bookings/BookingStatusBadge";
import PaymentStatusBadge from "@/components/dashboard/my-bookings/PaymentStatusBadge";
import RefundTracker from "@/components/dashboard/my-bookings/RefundTracker";
import RescheduleBookingButton from "@/components/dashboard/my-bookings/RescheduleBookingButton";
import RefundStatusBadge from "@/components/booking/RefundStatusBadge";
import {
  canCustomerCancelBooking,
  formatBookingTypeLabel,
  formatScheduleLine,
} from "@/lib/bookings/my-bookings-utils";
import {
  canGenerateTaxInvoice,
  isCancelledStatus,
  isPaymentCompleted,
} from "@/lib/bookings/invoice-access";
import { formatDate, formatINR } from "@/lib/utils";
import type { MyBookingRecord } from "@/types/database";

interface Props {
  booking: MyBookingRecord;
}

export default function MyBookingCard({ booking }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const isCancelled =
    booking.cancellation_status === "cancelled" ||
    booking.booking_status.toLowerCase() === "cancelled";

  const showCancel = canCustomerCancelBooking({
    bookingStatus: booking.booking_status,
    cancellationStatus: booking.cancellation_status,
    pickupDate: booking.pickup_date,
    pickupTime: booking.pickup_time,
  });

  const bookingId = booking.booking_reference ?? booking.id.slice(0, 8).toUpperCase();
  const paid = isPaymentCompleted(booking.payment_status);
  const cancelled = isCancelledStatus(booking.booking_status, booking.cancellation_status);
  const canDownloadInvoice = canGenerateTaxInvoice({
    paymentStatus: booking.payment_status,
    bookingStatus: booking.booking_status,
    cancellationStatus: booking.cancellation_status,
  });

  const rebookHref =
    booking.reference_id || booking.vehicle_id
      ? `/booking/${booking.reference_id || booking.vehicle_id}`
      : "/search";

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      style={{ animation: "fadeUp 0.35s ease-out both" }}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Vehicle image */}
        <div className="relative h-44 w-full shrink-0 bg-gradient-to-br from-slate-100 to-slate-200 lg:h-auto lg:w-52 xl:w-56">
          {booking.vehicle_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={booking.vehicle_image}
              alt={booking.vehicle_name ?? "Vehicle"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full min-h-[11rem] flex-col items-center justify-center gap-2 text-gray-400">
              <Car className="h-10 w-10 opacity-60" />
              <span className="text-xs font-medium">No image</span>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <BookingStatusBadge status={booking.booking_status} />
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-secondary truncate">
                {booking.vehicle_name ?? "Vehicle Booking"}
              </h3>
              <p className="mt-0.5 text-xs font-mono text-gray-500">#{bookingId}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {formatBookingTypeLabel(booking.booking_type)}
                </span>
                {booking.vehicle_type && (
                  <span className="text-xs text-gray-500 capitalize">{booking.vehicle_type}</span>
                )}
                {(booking.protection_selected || booking.flexible_cancellation) && (
                  <ProtectionStatusBadge
                    selected
                    fee={booking.flexible_cancellation_fee ?? undefined}
                  />
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold text-primary tabular-nums">{formatINR(booking.amount)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Total Paid</p>
              <p className="text-[10px] text-gray-400 mt-1">Booked {formatDate(booking.created_at)}</p>
            </div>
          </div>

          {/* Schedule grid */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Pickup
              </div>
              <p className="mt-1 text-sm font-medium text-secondary">
                {booking.pickup_location ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatScheduleLine(booking.pickup_date, booking.pickup_time)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <RotateCcw className="h-3.5 w-3.5 text-primary" />
                Return
              </div>
              <p className="mt-1 text-sm font-medium text-secondary">
                {booking.return_location ?? booking.pickup_location ?? "Same as pickup"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatScheduleLine(booking.return_date, booking.return_time)}
              </p>
            </div>
          </div>

          {/* Status row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PaymentStatusBadge status={booking.payment_status} />
            {isCancelled && booking.refund_status && (
              <RefundStatusBadge status={booking.refund_status} />
            )}
          </div>

          {isCancelled && booking.refund_status && (
            <RefundTracker
              refundStatus={booking.refund_status}
              refundAmount={booking.refund_amount}
              className="mt-3"
            />
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <Button
              href={`/booking/confirmation/${booking.id}`}
              variant="primary"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View Details
            </Button>
            {(canDownloadInvoice || (cancelled && paid)) ? (
              <Button href={`/booking/invoice/${booking.id}`} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                {cancelled ? "Cancellation Receipt" : "Download Invoice"}
              </Button>
            ) : (
              <Button href={`/booking/confirmation/${booking.id}`} variant="outline" size="sm">
                Continue to Payment
              </Button>
            )}
            <RescheduleBookingButton
              bookingId={booking.id}
              referenceId={booking.reference_id}
              bookingType={booking.booking_type}
              bookingStatus={booking.booking_status}
              protectionSelected={booking.protection_selected ?? undefined}
            />
            <Button href={rebookHref} variant="outline" size="sm">
              <Repeat className="h-4 w-4 mr-1.5" />
              Rebook
            </Button>
            {showCancel && (
              <CancelBookingButton
                bookingId={booking.id}
                bookingStatus={booking.booking_status}
                cancellationStatus={booking.cancellation_status}
                pickupDate={booking.pickup_date}
                pickupTime={booking.pickup_time}
                onCancelled={() => router.refresh()}
              />
            )}
          </div>

          {/* Expand timeline */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary"
          >
            {expanded ? (
              <>
                Hide Timeline <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                View Booking Timeline <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>

          {expanded && (
            <BookingTimeline
              bookingStatus={booking.booking_status}
              paymentStatus={booking.payment_status}
              cancellationStatus={booking.cancellation_status}
              refundStatus={booking.refund_status}
              createdAt={booking.created_at}
              cancelledAt={booking.cancelled_at}
              refundProcessedAt={booking.refund_processed_at}
              pickupDate={booking.pickup_date}
              pickupTime={booking.pickup_time}
              className="mt-2 border-t border-gray-100 pt-4"
            />
          )}
        </div>
      </div>
    </article>
  );
}
