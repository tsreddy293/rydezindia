/**
 * Central configuration for self-drive long-duration rental discounts.
 * Update tiers here only — do not duplicate percentages across the codebase.
 *
 * Future: pass `ownerTiers` from owner settings when per-vehicle overrides are enabled.
 */

export interface LongDurationDiscountTier {
  /** Inclusive minimum rental days. */
  minDays: number;
  /** Inclusive maximum rental days, or null for open-ended (30+). */
  maxDays: number | null;
  /** Discount percent applied to vehicle rent before platform fee & GST. */
  percent: number;
}

/** Default Rydez marketplace long-duration discount tiers. */
export const RYDEZ_DEFAULT_LONG_DURATION_DISCOUNT_TIERS: LongDurationDiscountTier[] = [
  { minDays: 1, maxDays: 6, percent: 0 },
  { minDays: 7, maxDays: 13, percent: 5 },
  { minDays: 14, maxDays: 29, percent: 10 },
  { minDays: 30, maxDays: null, percent: 15 },
];

export interface LongDurationDiscountOptions {
  /** When set, overrides Rydez defaults (future owner-controlled tiers). */
  ownerTiers?: LongDurationDiscountTier[] | null;
}

export function resolveLongDurationDiscountPercent(
  rentalDays: number,
  options?: LongDurationDiscountOptions
): number {
  const days = Math.max(1, Math.round(rentalDays));
  const tiers = options?.ownerTiers ?? RYDEZ_DEFAULT_LONG_DURATION_DISCOUNT_TIERS;

  for (const tier of tiers) {
    const max = tier.maxDays ?? Number.POSITIVE_INFINITY;
    if (days >= tier.minDays && days <= max) {
      return tier.percent;
    }
  }

  return 0;
}

export function formatLongDurationDiscountLabel(percent: number): string {
  if (percent <= 0) return "Long Duration Discount";
  return `Long Duration Discount (${percent}%)`;
}
