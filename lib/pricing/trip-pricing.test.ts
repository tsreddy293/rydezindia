import { calculateTripPricing, detectTripType, mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runPricingTests() {
  const test1 = calculateTripPricing({ tripType: "one_way", distanceKm: 64, ratePerKm: 14 });
  assert(test1.finalFare === 896, `Test 1 failed: expected 896, got ${test1.finalFare}`);

  const test2 = calculateTripPricing({ tripType: "round_trip", distanceKm: 64, ratePerKm: 14 });
  assert(test2.totalDistanceKm === 128, `Test 2 distance failed: ${test2.totalDistanceKm}`);
  assert(test2.baseFare === 1792, `Test 2 base failed: ${test2.baseFare}`);
  assert(test2.discountPercent === 10, `Test 2 discount % failed: ${test2.discountPercent}`);
  assert(test2.discountAmount === 179, `Test 2 discount amount failed: ${test2.discountAmount}`);
  assert(test2.finalFare === 1613, `Test 2 final failed: ${test2.finalFare}`);

  const test3 = calculateTripPricing({ tripType: "multi_city", distanceKm: 270, ratePerKm: 14 });
  assert(test3.finalFare === 3780, `Test 3 failed: expected 3780, got ${test3.finalFare}`);
  assert(test3.discountPercent === 0, `Test 3 discount should be 0`);

  const test4 = calculateTripPricing({
    tripType: "return_journey",
    distanceKm: 214.29,
    ratePerKm: 14,
    returnJourneyDiscountPercent: 30,
  });
  assert(test4.baseFare === 3000, `Test 4 base failed: ${test4.baseFare}`);
  assert(test4.finalFare === 2100, `Test 4 final failed: ${test4.finalFare}`);
  assert(test4.savings === 900, `Test 4 savings failed: ${test4.savings}`);

  assert(detectTripType(["Kakinada", "Rajahmundry", "Kakinada"]) === "round_trip", "Detect round trip failed");
  assert(
    detectTripType(["Hyderabad", "Vijayawada", "Visakhapatnam"]) === "multi_city",
    "Detect multi city failed"
  );
  assert(detectTripType(["Kakinada", "Rajahmundry"]) === "one_way", "Detect one way failed");

  const oneWay = calculateTripPricing({ tripType: "one_way", distanceKm: 64, ratePerKm: 14 });
  const roundTrip = calculateTripPricing({ tripType: "round_trip", distanceKm: 64, ratePerKm: 14 });
  assert(oneWay.finalFare !== roundTrip.finalFare, "One way and round trip must not match");

  return [
    "Test 1 One Way 64km @14 = ₹896 ✓",
    "Test 2 Round Trip 64km @14 = ₹1613 (10% off ₹1792) ✓",
    "Test 3 Multi City 270km @14 = ₹3780 ✓",
    "Test 4 Return Journey 30% off ₹3000 = ₹2100 ✓",
    "Auto-detect trip types ✓",
    "One Way ≠ Round Trip fare ✓",
  ];
}

if (require.main === module) {
  const results = runPricingTests();
  results.forEach((line) => console.log(line));
}

export { runPricingTests };
