import { formatPaymentStatusLabel } from "@/lib/bookings/my-bookings-utils";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  partial: "bg-sky-50 text-sky-700 ring-sky-600/20",
  refunded: "bg-violet-50 text-violet-700 ring-violet-600/20",
  failed: "bg-red-50 text-red-700 ring-red-600/20",
};

interface Props {
  status: string;
  className?: string;
}

export default function PaymentStatusBadge({ status, className = "" }: Props) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-700 ring-gray-600/20";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style} ${className}`}
    >
      {formatPaymentStatusLabel(status)}
    </span>
  );
}
