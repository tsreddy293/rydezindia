import { DEFAULT_DRIVER_RATE_PER_KM } from "@/lib/maps/constants";

export type TripPricingType = "one_way" | "round_trip" | "multi_city" | "return_journey";

export interface CalculateTripPricingInput {
  tripType: TripPricingType;
  /** One-way distance for one_way / round_trip / return_journey; total route distance for multi_city */
  distanceKm: number;
  ratePerKm?: number;
  /** Return journey discount between 20 and 40 (percent). Defaults to 30. */
  returnJourneyDiscountPercent?: number;
}

export interface TripPricingResult {
  tripType: TripPricingType;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  baseFare: number;
  discountPercent: number;
  discountAmount: number;
  finalFare: number;
  savings: number;
  ratePerKm: number;
}

function normalizeCityName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectTripType(cityNames: string[]): TripPricingType {
  const cities = cityNames.map((name) => name.trim()).filter(Boolean);
  if (cities.length <= 1) return "one_way";

  const first = normalizeCityName(cities[0]);
  const last = normalizeCityName(cities[cities.length - 1]);

  if (first === last) return "round_trip";
  if (cities.length > 2) return "multi_city";
  return "one_way";
}

export function getRoundTripDiscountPercent(roundTripDistanceKm: number): number {
  if (roundTripDistanceKm >= 250) return 15;
  if (roundTripDistanceKm >= 100) return 10;
  return 5;
}

function clampReturnJourneyDiscount(percent?: number): number {
  if (typeof percent !== "number" || Number.isNaN(percent)) return 30;
  return Math.min(40, Math.max(20, Math.round(percent)));
}

export function calculateTripPricing(input: CalculateTripPricingInput): TripPricingResult {
  const ratePerKm = input.ratePerKm ?? DEFAULT_DRIVER_RATE_PER_KM;
  const oneWayDistanceKm = Math.max(0, input.distanceKm);

  switch (input.tripType) {
    case "round_trip": {
      const totalDistanceKm = oneWayDistanceKm * 2;
      const baseFare = Math.round(totalDistanceKm * ratePerKm);
      const discountPercent = getRoundTripDiscountPercent(totalDistanceKm);
      const discountAmount = Math.round(baseFare * (discountPercent / 100));
      const finalFare = baseFare - discountAmount;

      return {
        tripType: "round_trip",
        oneWayDistanceKm,
        totalDistanceKm,
        baseFare,
        discountPercent,
        discountAmount,
        finalFare,
        savings: discountAmount,
        ratePerKm,
      };
    }

    case "multi_city": {
      const totalDistanceKm = oneWayDistanceKm;
      const baseFare = Math.round(totalDistanceKm * ratePerKm);

      return {
        tripType: "multi_city",
        oneWayDistanceKm: totalDistanceKm,
        totalDistanceKm,
        baseFare,
        discountPercent: 0,
        discountAmount: 0,
        finalFare: baseFare,
        savings: 0,
        ratePerKm,
      };
    }

    case "return_journey": {
      const totalDistanceKm = oneWayDistanceKm;
      const baseFare = Math.round(totalDistanceKm * ratePerKm);
      const discountPercent = clampReturnJourneyDiscount(input.returnJourneyDiscountPercent);
      const discountAmount = Math.round(baseFare * (discountPercent / 100));
      const finalFare = baseFare - discountAmount;

      return {
        tripType: "return_journey",
        oneWayDistanceKm,
        totalDistanceKm,
        baseFare,
        discountPercent,
        discountAmount,
        finalFare,
        savings: discountAmount,
        ratePerKm,
      };
    }

    case "one_way":
    default: {
      const totalDistanceKm = oneWayDistanceKm;
      const baseFare = Math.round(totalDistanceKm * ratePerKm);

      return {
        tripType: "one_way",
        oneWayDistanceKm,
        totalDistanceKm,
        baseFare,
        discountPercent: 0,
        discountAmount: 0,
        finalFare: baseFare,
        savings: 0,
        ratePerKm,
      };
    }
  }
}

export function mapDriverTripTypeLabel(
  tripType: string | undefined
): TripPricingType | undefined {
  switch (tripType?.toLowerCase()) {
    case "one way":
      return "one_way";
    case "round trip":
      return "round_trip";
    case "multi-city":
    case "multi city":
      return "multi_city";
    default:
      return undefined;
  }
}
