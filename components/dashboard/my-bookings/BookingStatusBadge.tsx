import {
  formatBookingStatusLabel,
} from "@/lib/bookings/my-bookings-utils";
import {
  resolveBookingStatusKind,
  RIDER_STATUS_STYLES,
  statusKindLabel,
} from "@/lib/rider/status-styles";

interface Props {
  status: string;
  paymentStatus?: string;
  pickupDate?: string | null;
  className?: string;
}

export default function BookingStatusBadge({ status, paymentStatus, pickupDate, className = "" }: Props) {
  const kind = resolveBookingStatusKind(status, paymentStatus, pickupDate);
  const style = RIDER_STATUS_STYLES[kind];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style} ${className}`}
    >
      {pickupDate || paymentStatus ? statusKindLabel(kind) : formatBookingStatusLabel(status)}
    </span>
  );
}
