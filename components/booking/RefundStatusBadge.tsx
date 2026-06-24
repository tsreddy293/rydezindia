import type { RefundStatus } from "@/lib/services/cancellation-policy";

const STATUS_STYLES: Record<RefundStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  refunded: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  processing: "Processing",
  refunded: "Refunded",
  rejected: "Rejected",
};

interface Props {
  status: string | null | undefined;
  className?: string;
}

export default function RefundStatusBadge({ status, className = "" }: Props) {
  if (!status) return null;
  const key = status.toLowerCase() as RefundStatus;
  const style = STATUS_STYLES[key] ?? "bg-gray-100 text-gray-700";
  const label = STATUS_LABELS[key] ?? status;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style} ${className}`}>
      {label}
    </span>
  );
}
