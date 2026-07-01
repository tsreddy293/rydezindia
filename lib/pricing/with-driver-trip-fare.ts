import {
  calculateAiPricing,
  type AiPricingInput,
  type AiPricingResult,
} from "@/lib/pricing/ai-pricing-engine";

/**
 * Single entry point for with-driver trip fare across search, booking, payment,
 * confirmation, and invoice (amount is persisted at booking creation).
 */
export function estimateWithDriverTripFare(input: AiPricingInput): AiPricingResult {
  return calculateAiPricing({
    ...input,
    driverRequired: input.driverRequired ?? true,
  });
}

/** Use measured route distance only — never substitute a placeholder km value. */
export function resolveTripDistanceKm(
  distanceKm: number | string | undefined | null
): number {
  const km = typeof distanceKm === "string" ? Number(distanceKm) : Number(distanceKm ?? 0);
  if (!Number.isFinite(km) || km <= 0) return 0;
  return km;
}

export type { AiPricingInput, AiPricingResult };
