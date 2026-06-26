import {
  resolveBookingStatusKind,
  RIDER_STATUS_STYLES,
  statusKindLabel,
} from "@/lib/rider/status-styles";

export default function RiderStatusBadge({
  bookingStatus,
  paymentStatus,
  pickupDate,
  className = "",
}: {
  bookingStatus: string;
  paymentStatus?: string;
  pickupDate?: string | null;
  className?: string;
}) {
  const kind = resolveBookingStatusKind(bookingStatus, paymentStatus, pickupDate);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${RIDER_STATUS_STYLES[kind]} ${className}`}
    >
      {statusKindLabel(kind)}
    </span>
  );
}
