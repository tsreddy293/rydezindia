/** Customer cancellation reason options for My Bookings. */

export const CANCELLATION_REASON_OPTIONS = [
  { value: "change_of_plans", label: "Change of plans" },
  { value: "booked_by_mistake", label: "Booked by mistake" },
  { value: "found_another_vehicle", label: "Found another vehicle" },
  { value: "price_issue", label: "Price issue" },
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
