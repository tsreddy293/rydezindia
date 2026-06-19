interface Props {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_submitted: { label: "Not Submitted", className: "bg-gray-100 text-gray-600" },
  pending: { label: "Pending Review", className: "bg-yellow-100 text-yellow-700" },
  submitted: { label: "Submitted", className: "bg-yellow-100 text-yellow-700" },
  verified: { label: "Verified", className: "bg-green-100 text-green-700" },
  approved: { label: "Verified", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export default function KycStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_submitted;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
