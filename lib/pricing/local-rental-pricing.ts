import {
  LOCAL_RENTAL_PACKAGES,
  type LocalRentalPackageKey,
} from "@/lib/maps/constants";

/** Standard overage rates for local rental packages (INR). */
export const LOCAL_RENTAL_EXTRA_HOUR_RATE = 200;
export const LOCAL_RENTAL_EXTRA_KM_RATE = 14;

const VEHICLE_MULTIPLIERS: Record<string, number> = {
  Hatchback: 1.0,
  Sedan: 1.05,
  SUV: 1.15,
  MUV: 1.12,
  Luxury: 1.35,
  Van: 1.2,
  "Tempo Traveller": 1.4,
  "Mini Bus": 1.55,
  Bus: 1.7,
};

export interface LocalRentalPricingInput {
  packageKey: string;
  extraHours?: number;
  extraKm?: number;
  /** Actual trip distance — used to derive extra km over package allowance when extraKm omitted. */
  actualDistanceKm?: number;
  /** Actual trip duration in hours — used when extraHours omitted. */
  actualHours?: number;
  vehicleType?: string;
}

export interface LocalRentalPricingResult {
  packageKey: LocalRentalPackageKey;
  packageLabel: string;
  includedHours: number;
  includedKm: number;
  basePrice: number;
  vehicleMultiplier: number;
  adjustedBasePrice: number;
  extraHours: number;
  extraKm: number;
  extraHourCharge: number;
  extraKmCharge: number;
  platformFee: number;
  totalFare: number;
}

export function resolveLocalRentalPackageKey(key?: string | null): LocalRentalPackageKey {
  const normalized = String(key ?? "").trim();
  const match = LOCAL_RENTAL_PACKAGES.find((pkg) => pkg.key === normalized);
  return match?.key ?? LOCAL_RENTAL_PACKAGES[0].key;
}

export function getLocalRentalPackage(key?: string | null) {
  const resolved = resolveLocalRentalPackageKey(key);
  return LOCAL_RENTAL_PACKAGES.find((pkg) => pkg.key === resolved)!;
}

function vehicleMultiplier(vehicleType?: string): number {
  return VEHICLE_MULTIPLIERS[vehicleType ?? "Sedan"] ?? 1.05;
}

export function calculateLocalRentalPricing(input: LocalRentalPricingInput): LocalRentalPricingResult {
  const pkg = getLocalRentalPackage(input.packageKey);
  const multiplier = vehicleMultiplier(input.vehicleType);
  const adjustedBasePrice = Math.round(pkg.basePrice * multiplier);

  const derivedExtraKm =
    typeof input.actualDistanceKm === "number" && input.actualDistanceKm > pkg.km
      ? Math.ceil(input.actualDistanceKm - pkg.km)
      : 0;
  const derivedExtraHours =
    typeof input.actualHours === "number" && input.actualHours > pkg.hours
      ? Math.ceil(input.actualHours - pkg.hours)
      : 0;

  const extraHours = Math.max(0, Math.round(Number(input.extraHours ?? derivedExtraHours)));
  const extraKm = Math.max(0, Math.round(Number(input.extraKm ?? derivedExtraKm)));

  const extraHourCharge = extraHours * LOCAL_RENTAL_EXTRA_HOUR_RATE;
  const extraKmCharge = extraKm * LOCAL_RENTAL_EXTRA_KM_RATE;
  const subtotal = adjustedBasePrice + extraHourCharge + extraKmCharge;
  const platformFee = Math.round(subtotal * 0.05);
  const totalFare = subtotal + platformFee;

  return {
    packageKey: pkg.key,
    packageLabel: pkg.label,
    includedHours: pkg.hours,
    includedKm: pkg.km,
    basePrice: pkg.basePrice,
    vehicleMultiplier: multiplier,
    adjustedBasePrice,
    extraHours,
    extraKm,
    extraHourCharge,
    extraKmCharge,
    platformFee,
    totalFare,
  };
}
