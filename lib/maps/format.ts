import { DEFAULT_DRIVER_RATE_PER_KM } from "./constants";

export function formatDistanceKm(km: number): string {
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} KM`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/** @deprecated Use calculateTripPricing from @/lib/pricing/trip-pricing */
export function estimateDriverFare(distanceKm: number, ratePerKm = DEFAULT_DRIVER_RATE_PER_KM): number {
  return Math.round(Math.max(ratePerKm * distanceKm, ratePerKm * 5));
}

/** @deprecated Use calculateTripPricing with tripType return_journey */
export function estimateStandardFare(distanceKm: number, ratePerKm = DEFAULT_DRIVER_RATE_PER_KM): number {
  return Math.round(Math.max(ratePerKm * distanceKm * 1.67, ratePerKm * 5));
}

/** @deprecated Use TripPricingResult.discountPercent */
export function calculateSavingsPercent(discounted: number, standard: number): number {
  if (standard <= 0) return 0;
  return Math.max(0, Math.round(((standard - discounted) / standard) * 100));
}
