/** Customer cancellation reason options for My Bookings. */

export const CANCELLATION_REASON_OPTIONS = [
  { value: "booked_by_mistake", label: "Booked by mistake" },
  { value: "found_another_vehicle", label: "Found another vehicle" },
  { value: "price_too_high", label: "Price too high" },
  { value: "travel_plan_changed", label: "Travel plan changed" },
  { value: "other", label: "Other" },
] as const;

export type CancellationReasonCategory = (typeof CANCELLATION_REASON_OPTIONS)[number]["value"];

const LEGACY_LABELS: Record<string, string> = {
  change_of_plans: "Travel plan changed",
  price_issue: "Price too high",
};

export function getCancellationReasonLabel(category: string): string {
  const match = CANCELLATION_REASON_OPTIONS.find((option) => option.value === category);
  if (match) return match.label;
  return LEGACY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function formatCancellationReason(category: string, details?: string | null): string {
  const label = getCancellationReasonLabel(category);
  const trimmed = details?.trim();
  if (!trimmed || category !== "other") return label;
  return `${label}: ${trimmed}`;
}
