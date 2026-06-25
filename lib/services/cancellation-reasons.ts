/** Customer cancellation reason options for My Bookings. */

export const CANCELLATION_REASON_OPTIONS = [
  { value: "change_of_plans", label: "Change of Plans" },
  { value: "found_alternative", label: "Found Alternative Vehicle" },
  { value: "emergency", label: "Emergency" },
  { value: "pricing_issue", label: "Pricing Issue" },
  { value: "other", label: "Other" },
] as const;

export type CancellationReasonCategory = (typeof CANCELLATION_REASON_OPTIONS)[number]["value"];

export function getCancellationReasonLabel(category: string): string {
  const match = CANCELLATION_REASON_OPTIONS.find((option) => option.value === category);
  return match?.label ?? category;
}

export function formatCancellationReason(category: string, details?: string | null): string {
  const label = getCancellationReasonLabel(category);
  const trimmed = details?.trim();
  if (!trimmed || category !== "other") return label;
  return `${label}: ${trimmed}`;
}
