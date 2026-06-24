interface Props {
  selected?: boolean | null;
  fee?: number | null;
  className?: string;
}

export default function ProtectionStatusBadge({ selected, fee, className = "" }: Props) {
  if (!selected) {
    return (
      <span className={`inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ${className}`}>
        Standard policy
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ${className}`}
    >
      <span aria-hidden>🛡</span>
      Protected{fee ? ` · ₹${fee}` : ""}
    </span>
  );
}
