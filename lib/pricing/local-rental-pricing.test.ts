import { calculateLocalRentalPricing } from "@/lib/pricing/local-rental-pricing";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function runLocalRentalPricingTests() {
  const base = calculateLocalRentalPricing({ packageKey: "4h_40km", vehicleType: "Sedan" });
  assert(base.adjustedBasePrice === 1260, `sedan base: ${base.adjustedBasePrice}`);
  assert(base.totalFare === base.adjustedBasePrice + base.platformFee, "includes platform fee");

  const extras = calculateLocalRentalPricing({
    packageKey: "4h_40km",
    vehicleType: "Sedan",
    extraHours: 2,
    extraKm: 10,
  });
  assert(extras.extraHourCharge === 400, "extra hours");
  assert(extras.extraKmCharge === 140, "extra km");

  const derived = calculateLocalRentalPricing({
    packageKey: "8h_80km",
    actualDistanceKm: 95,
    actualHours: 9,
  });
  assert(derived.extraKm === 15, `derived extra km: ${derived.extraKm}`);
  assert(derived.extraHours === 1, `derived extra hour: ${derived.extraHours}`);

  return ["Local rental package + overage pricing ✓"];
}

if (require.main === module) {
  runLocalRentalPricingTests().forEach((line) => console.log(line));
}
