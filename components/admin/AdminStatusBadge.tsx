import type { OwnerStatus } from "@/lib/admin/owner-status";

type StatusValue = OwnerStatus | string;

const CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800" },
  verified: { label: "Approved", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  registered: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  not_submitted: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  blocked: { label: "Blocked", className: "bg-red-100 text-red-800" },
};

export function normalizeAdminBadgeStatus(status: string): string {
  const value = status.toLowerCase();
  if (value === "verified") return "approved";
  if (value === "not_submitted" || value === "registered") return "pending";
  return value || "pending";
}

export default function AdminStatusBadge({ status }: { status: StatusValue }) {
  const key = normalizeAdminBadgeStatus(String(status));
  const config = CONFIG[key] ?? CONFIG.pending;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${config.className}`}>
      {config.label}
    </span>
  );
}
