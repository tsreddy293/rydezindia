import { estimateWithDriverTripFare, resolveTripDistanceKm } from "@/lib/pricing/with-driver-trip-fare";
import { mapDriverTripTypeLabel } from "@/lib/pricing/trip-pricing";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runWithDriverTripFareTests() {
  const distanceKm = 228;
  const input = {
    distanceKm,
    tripType: "one_way" as const,
    vehicleType: "Sedan",
    fuelType: "Petrol",
    ratePerKm: 14,
  };

  const searchFare = estimateWithDriverTripFare(input).finalFare;
  const bookingFare = estimateWithDriverTripFare({
    ...input,
    distanceKm: resolveTripDistanceKm(String(distanceKm)),
  }).finalFare;

  assert(searchFare === bookingFare, `Search and booking fares must match: ${searchFare} vs ${bookingFare}`);
  assert(searchFare > 0, "Fare must be positive for a valid route distance");

  const roundTripFare = estimateWithDriverTripFare({
    ...input,
    tripType: "round_trip",
  }).finalFare;
  assert(roundTripFare > searchFare, "Round trip fare must exceed one-way for the same leg distance");

  const mappedTripType = mapDriverTripTypeLabel("Round Trip");
  assert(mappedTripType === "round_trip", "Trip type label must map consistently");

  assert(resolveTripDistanceKm("228") === 228, "URL distance param must parse as km");
  assert(resolveTripDistanceKm(0) === 0, "Invalid distance must resolve to zero");

  console.log("with-driver-trip-fare tests passed");
}

runWithDriverTripFareTests();
