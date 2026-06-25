import type { RefundStatus } from "@/lib/services/cancellation-policy";
import { formatRefundStatusLabel } from "@/lib/bookings/my-bookings-utils";

const STATUS_STYLES: Record<RefundStatus, string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
  approved: "bg-blue-100 text-blue-800 ring-blue-600/20",
  processing: "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  refunded: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  rejected: "bg-red-100 text-red-800 ring-red-600/20",
};

interface Props {
  status: string | null | undefined;
  className?: string;
}

export default function RefundStatusBadge({ status, className = "" }: Props) {
  if (!status) return null;
  const key = status.toLowerCase() as RefundStatus;
  const style = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-700 ring-gray-600/20";
  const label = formatRefundStatusLabel(status);

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style} ${className}`}>
      {label}
    </span>
  );
}
