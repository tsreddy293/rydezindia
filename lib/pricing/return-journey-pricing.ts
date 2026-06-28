/**
 * Return journey fare is always derived from the published listing seat price in the database.
 * Search, checkout, booking insert, and payment must all use this module.
 */

export interface ReturnJourneyListingPrice {
  price?: number | null;
  price_per_seat?: number | null;
  discount_percent?: number | null;
}

export interface ReturnJourneyPricingInput {
  pricePerSeat: number;
  seatsBooked?: number;
  listingDiscountPercent?: number;
}

export interface ReturnJourneyPricingResult {
  pricePerSeat: number;
  seatsBooked: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalFare: number;
}

function clampListingDiscount(percent?: number | null): number {
  if (typeof percent !== "number" || Number.isNaN(percent)) return 0;
  return Math.min(40, Math.max(0, Math.round(percent)));
}

/** Resolve per-seat price from a return journey / search result row. */
export function resolveReturnJourneyPricePerSeat(listing: ReturnJourneyListingPrice): number {
  return Math.max(0, Math.round(Number(listing.price ?? listing.price_per_seat ?? 0)));
}

export function calculateReturnJourneyPricing(
  input: ReturnJourneyPricingInput
): ReturnJourneyPricingResult {
  const pricePerSeat = Math.max(0, Math.round(Number(input.pricePerSeat)));
  const seatsBooked = Math.max(1, Math.round(Number(input.seatsBooked ?? 1)));
  const discountPercent = clampListingDiscount(input.listingDiscountPercent);
  const subtotal = pricePerSeat * seatsBooked;
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalFare = Math.max(0, subtotal - discountAmount);

  return {
    pricePerSeat,
    seatsBooked,
    subtotal,
    discountPercent,
    discountAmount,
    totalFare,
  };
}

export function calculateReturnJourneyPricingFromListing(
  listing: ReturnJourneyListingPrice,
  seatsBooked = 1
): ReturnJourneyPricingResult {
  return calculateReturnJourneyPricing({
    pricePerSeat: resolveReturnJourneyPricePerSeat(listing),
    seatsBooked,
    listingDiscountPercent: listing.discount_percent ?? 0,
  });
}
