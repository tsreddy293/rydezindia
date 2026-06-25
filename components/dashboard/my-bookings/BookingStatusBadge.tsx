import {
  formatBookingStatusLabel,
} from "@/lib/bookings/my-bookings-utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  active: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-slate-100 text-slate-700 ring-slate-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  approved: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

interface Props {
  status: string;
  className?: string;
}

export default function BookingStatusBadge({ status, className = "" }: Props) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-700 ring-gray-600/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style} ${className}`}
    >
      {formatBookingStatusLabel(status)}
    </span>
  );
}
