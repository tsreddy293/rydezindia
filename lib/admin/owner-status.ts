export type OwnerStatus = "pending" | "approved" | "rejected";

export const OWNER_STATUSES: OwnerStatus[] = ["pending", "approved", "rejected"];

export function normalizeOwnerStatus(value: unknown, kycFallback?: string): OwnerStatus {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "approved" || raw === "verified") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "pending") return "pending";

  const kyc = String(kycFallback ?? "").toLowerCase();
  if (kyc === "verified") return "approved";
  if (kyc === "rejected") return "rejected";
  if (kyc === "pending") return "pending";

  return "pending";
}

export function ownerStatusBadgeClasses(status: OwnerStatus): string {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export function ownerStatusButtonClasses(status: OwnerStatus, isActive: boolean): string {
  if (!isActive) {
    return "rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 capitalize";
  }
  if (status === "approved") {
    return "rounded-lg border border-green-300 bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 capitalize cursor-default";
  }
  if (status === "rejected") {
    return "rounded-lg border border-red-300 bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 capitalize cursor-default";
  }
  return "rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 capitalize cursor-default";
}
