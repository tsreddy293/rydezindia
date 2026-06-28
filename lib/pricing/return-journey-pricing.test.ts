import {
  calculateReturnJourneyPricing,
  calculateReturnJourneyPricingFromListing,
  resolveReturnJourneyPricePerSeat,
} from "@/lib/pricing/return-journey-pricing";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function runReturnJourneyPricingTests() {
  assert(resolveReturnJourneyPricePerSeat({ price_per_seat: 500 }) === 500, "price_per_seat");
  assert(resolveReturnJourneyPricePerSeat({ price: 450 }) === 450, "price fallback");

  const twoSeats = calculateReturnJourneyPricing({ pricePerSeat: 500, seatsBooked: 2 });
  assert(twoSeats.totalFare === 1000, `two seats total: ${twoSeats.totalFare}`);

  const discounted = calculateReturnJourneyPricingFromListing(
    { price_per_seat: 1000, discount_percent: 20 },
    2
  );
  assert(discounted.subtotal === 2000, "subtotal");
  assert(discounted.discountAmount === 400, "discount");
  assert(discounted.totalFare === 1600, "discounted total");

  return ["Return journey DB seat pricing ✓"];
}

if (require.main === module) {
  runReturnJourneyPricingTests().forEach((line) => console.log(line));
}
