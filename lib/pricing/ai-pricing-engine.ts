import { DEFAULT_DRIVER_RATE_PER_KM } from "@/lib/maps/constants";
import { calculateTripPricing, type TripPricingType } from "@/lib/pricing/trip-pricing";

export type VehicleCategory =
  | "Hatchback"
  | "Sedan"
  | "SUV"
  | "Luxury"
  | "Van"
  | "Tempo Traveller"
  | "Mini Bus"
  | "MUV"
  | "Bus";

export type FuelType = "Petrol" | "Diesel" | "CNG" | "EV" | "Electric";

const VEHICLE_MULTIPLIERS: Record<string, number> = {
  Hatchback: 1.0,
  Sedan: 1.1,
  SUV: 1.25,
  MUV: 1.2,
  Luxury: 1.6,
  Van: 1.3,
  "Tempo Traveller": 1.5,
  "Mini Bus": 1.8,
  Bus: 2.0,
};

const FUEL_MULTIPLIERS: Record<string, number> = {
  Petrol: 1.0,
  Diesel: 1.05,
  CNG: 0.95,
  EV: 0.9,
  Electric: 0.9,
};

const PLATFORM_FEE_PERCENT = 5;
const DRIVER_REQUIRED_FEE = 500;

export interface AiPricingInput {
  distanceKm: number;
  tripType: TripPricingType;
  vehicleType?: string;
  fuelType?: string;
  driverRequired?: boolean;
  ratePerKm?: number;
  returnJourneyDiscountPercent?: number;
}

export interface AiPricingResult {
  baseFare: number;
  platformFee: number;
  discountPercent: number;
  discountAmount: number;
  driverFee: number;
  finalFare: number;
  savings: number;
  ratePerKm: number;
  tripType: TripPricingType;
}

export function calculateAiPricing(input: AiPricingInput): AiPricingResult {
  const vehicleMultiplier = VEHICLE_MULTIPLIERS[input.vehicleType ?? "Sedan"] ?? 1.1;
  const fuelMultiplier = FUEL_MULTIPLIERS[input.fuelType ?? "Petrol"] ?? 1.0;
  const baseRate =
    (input.ratePerKm ?? DEFAULT_DRIVER_RATE_PER_KM) * vehicleMultiplier * fuelMultiplier;

  const trip = calculateTripPricing({
    tripType: input.tripType,
    distanceKm: input.distanceKm,
    ratePerKm: baseRate,
    returnJourneyDiscountPercent: input.returnJourneyDiscountPercent,
  });

  const driverFee = input.driverRequired !== false ? DRIVER_REQUIRED_FEE : 0;
  const subtotal = trip.finalFare + driverFee;
  const platformFee = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100));
  const finalFare = subtotal + platformFee;

  return {
    baseFare: trip.baseFare,
    platformFee,
    discountPercent: trip.discountPercent,
    discountAmount: trip.discountAmount,
    driverFee,
    finalFare,
    savings: trip.savings,
    ratePerKm: trip.ratePerKm,
    tripType: input.tripType,
  };
}

/** Return journey discount tiers: 20–40% based on seat fill rate */
export function getReturnJourneyDiscountPercent(availableSeats: number, totalSeats: number): number {
  if (totalSeats <= 0) return 30;
  const fillRatio = 1 - availableSeats / totalSeats;
  if (fillRatio >= 0.75) return 40;
  if (fillRatio >= 0.5) return 35;
  if (fillRatio >= 0.25) return 30;
  if (fillRatio > 0) return 25;
  return 20;
}

export function getAdvancePaymentAmount(finalFare: number, type: "advance" | "full" = "advance"): number {
  if (type === "full") return finalFare;
  return Math.round(finalFare * 0.3);
}
