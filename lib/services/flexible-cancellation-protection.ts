/** Flexible Cancellation Protection — premium add-on for Rydez India self-drive. */

export const FLEXIBLE_PROTECTION_NAME = "Flexible Cancellation Protection";
export const FLEXIBLE_PROTECTION_REFUND_SLA = "24–48 hours";
export const STANDARD_REFUND_SLA = "3–7 business days";

export type ProtectionVehicleCategory =
  | "hatchback"
  | "sedan"
  | "compact_suv"
  | "suv"
  | "premium_suv"
  | "luxury";

export type ProtectionStatus = "inactive" | "active" | "used" | "expired" | "cancelled";

export const PROTECTION_PRICING: Record<ProtectionVehicleCategory, number> = {
  hatchback: 99,
  sedan: 99,
  compact_suv: 149,
  suv: 149,
  premium_suv: 199,
  luxury: 299,
};

export const PROTECTION_CATEGORY_LABELS: Record<ProtectionVehicleCategory, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  compact_suv: "Compact SUV",
  suv: "SUV",
  premium_suv: "Premium SUV",
  luxury: "Luxury",
};

/** @deprecated Use getProtectionFeeForVehicle */
export const FLEXIBLE_PROTECTION_FEE = 99;

export interface ProtectionFeature {
  text: string;
  highlight?: boolean;
}

export interface ProtectionComparisonRow {
  feature: string;
  regular: string;
  protected: string;
}

/** Short benefits shown on the booking card. */
export const FLEXIBLE_PROTECTION_CARD_BENEFITS = [
  "Cancel up to 6 hours before pickup and get 100% Trip Fare Refund",
  "One Free Reschedule",
  "Priority Refund Processing",
  "Emergency Cancellation Support",
  "Faster Customer Support",
] as const;

export const FLEXIBLE_PROTECTION_FEATURES: ProtectionFeature[] = [
  { text: "Cancel up to 6 hours before pickup: 100% trip fare refund", highlight: true },
  { text: "Cancel between 3–6 hours before pickup: 90% trip fare refund" },
  { text: "Cancel within 3 hours of pickup: 75% trip fare refund" },
  { text: "No trip fare refund after pickup time" },
  { text: "One free reschedule allowed", highlight: true },
  { text: "Priority refund processing: 24–48 hours", highlight: true },
  { text: "Emergency cancellation support" },
  { text: "Faster customer support" },
  { text: "Protection fee is non-refundable (applies to trip fare only)", highlight: true },
  { text: "Refundable security deposit handled separately", highlight: true },
  { text: "Valid for this booking only — cannot be transferred" },
];

export const PROTECTION_COMPARISON_ROWS: ProtectionComparisonRow[] = [
  { feature: "48+ hours before pickup", regular: "100% refund", protected: "100% trip fare" },
  { feature: "24–48 hours before pickup", regular: "90% refund", protected: "100% trip fare" },
  { feature: "12–24 hours before pickup", regular: "75% refund", protected: "100% trip fare" },
  { feature: "6–12 hours before pickup", regular: "50% refund", protected: "100% trip fare" },
  { feature: "3–6 hours before pickup", regular: "50% refund", protected: "90% refund" },
  { feature: "Below 3 hours", regular: "50% refund", protected: "75% refund" },
  { feature: "After pickup time", regular: "No refund", protected: "No refund" },
  { feature: "Free reschedule", regular: "Not included", protected: "1 free reschedule" },
  { feature: "Refund processing", regular: STANDARD_REFUND_SLA, protected: FLEXIBLE_PROTECTION_REFUND_SLA },
  { feature: "Support", regular: "Standard", protected: "Priority + emergency" },
  { feature: "Protection fee", regular: "—", protected: "Category-based (non-refundable)" },
  { feature: "Security deposit", regular: "Refunded separately", protected: "Refunded separately" },
];

export function normalizeVehicleCategory(vehicleType?: string | null): ProtectionVehicleCategory {
  const t = String(vehicleType ?? "")
    .toLowerCase()
    .replace(/[_-]/g, " ");

  if (t.includes("luxury") || t.includes("bmw") || t.includes("mercedes") || t.includes("audi")) {
    return "luxury";
  }
  if (t.includes("premium") && t.includes("suv")) return "premium_suv";
  if (t.includes("compact") && t.includes("suv")) return "compact_suv";
  if (/\bsuv\b/.test(t) || t.includes("muv") || t.includes("innova")) return "suv";
  if (t.includes("sedan")) return "sedan";
  if (t.includes("hatch")) return "hatchback";
  return "hatchback";
}

export function getProtectionFeeForVehicle(vehicleType?: string | null): number {
  return PROTECTION_PRICING[normalizeVehicleCategory(vehicleType)];
}

export function getProtectionPlanName(vehicleType?: string | null): string {
  const category = normalizeVehicleCategory(vehicleType);
  return `${FLEXIBLE_PROTECTION_NAME} — ${PROTECTION_CATEGORY_LABELS[category]} Plan`;
}

export function formatProtectionPriceLabel(vehicleType?: string | null): string {
  const fee = getProtectionFeeForVehicle(vehicleType);
  return `₹${fee}`;
}

export function flexibleProtectionTripFarePercent(
  hoursBefore: number | null,
  afterStart: boolean
): number {
  if (afterStart || hoursBefore === null || hoursBefore < 0) return 0;
  if (hoursBefore >= 6) return 100;
  if (hoursBefore >= 3) return 90;
  return 75;
}

export function flexibleProtectionTierLabel(
  hoursBefore: number | null,
  afterStart: boolean
): string {
  if (afterStart || hoursBefore === null || hoursBefore < 0) {
    return "Protected policy — no trip fare refund after pickup";
  }
  if (hoursBefore >= 6) return "Protected policy — 100% trip fare (6+ hours before pickup)";
  if (hoursBefore >= 3) return "Protected policy — 90% trip fare (3–6 hours before pickup)";
  return "Protected policy — 75% trip fare (within 3 hours of pickup)";
}

export function getRefundProcessingEstimate(protectionSelected: boolean): string {
  return protectionSelected
    ? `Refund will be processed within ${FLEXIBLE_PROTECTION_REFUND_SLA}.`
    : `Refund will be processed within ${STANDARD_REFUND_SLA}.`;
}

export function calculateGrandTotalWithProtection(input: {
  tripFare: number;
  depositAmount: number;
  depositAtPickup: boolean;
  paymentType: "advance" | "full";
  protectionFee: number;
  protectionSelected: boolean;
}): { payNow: number; displayGrandTotal: number } {
  const { tripFare, depositAmount, depositAtPickup, paymentType, protectionFee, protectionSelected } =
    input;
  const farePortion =
    paymentType === "advance" ? Math.round(tripFare * 0.3) : tripFare;
  const protection = protectionSelected ? protectionFee : 0;
  const payNow =
    farePortion + (depositAtPickup ? 0 : depositAmount) + protection;
  const displayGrandTotal = tripFare + depositAmount + protection;
  return { payNow, displayGrandTotal };
}
