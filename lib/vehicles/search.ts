import { vehicleDisplayName, mapVehicleRow } from "@/lib/vehicles/format";

export const SEARCH_VEHICLE_CATEGORIES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "Luxury",
  "Van",
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  sedan: "Sedan",
  suv: "SUV",
  hatchback: "Hatchback",
  luxury: "Luxury",
  van: "Van",
  muv: "SUV",
  "tempo traveller": "Van",
  "mini bus": "Van",
};

const DEFAULT_DAILY_FARE: Record<string, number> = {
  Hatchback: 1499,
  Sedan: 1799,
  SUV: 2499,
  Luxury: 4999,
  Van: 2999,
};

const DEFAULT_SECURITY_DEPOSIT: Record<string, number> = {
  Hatchback: 5000,
  Sedan: 8000,
  SUV: 10000,
  Luxury: 20000,
  Van: 12000,
};

export function normalizeVehicleCategory(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "";
  return CATEGORY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function matchesVehicleCategory(vehicleCategory: string, filterCategory?: string): boolean {
  if (!filterCategory?.trim()) return true;
  const vehicle = normalizeVehicleCategory(vehicleCategory).toLowerCase();
  const filter = normalizeVehicleCategory(filterCategory).toLowerCase();
  return vehicle === filter;
}

export function matchesCity(resolvedCity: string, filterCity?: string): boolean {
  if (!filterCity?.trim()) return true;
  const city = resolvedCity.trim().toLowerCase();
  const filter = filterCity.trim().toLowerCase();
  // Listings without a city still appear (owner/vehicle city not set yet).
  if (!city) return true;
  return city.includes(filter) || filter.includes(city);
}

/** Mask registration e.g. AP05DD6116 → AP****6116 */
export function maskRegistrationNumber(registration: string): string {
  const clean = registration.replace(/\s/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  if (clean.length <= 6) return `****${clean.slice(-4)}`;
  return `${clean.slice(0, 2)}${"*".repeat(Math.max(clean.length - 6, 2))}${clean.slice(-4)}`;
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function resolveDailyFare(row: Record<string, unknown>, category: string): number {
  const stored = readNumber(row, "daily_fare", "daily_rent", "price");
  if (stored > 0) return stored;
  return DEFAULT_DAILY_FARE[normalizeVehicleCategory(category)] ?? 1799;
}

export function resolveSecurityDeposit(row: Record<string, unknown>, category: string): number {
  const stored = readNumber(row, "security_deposit");
  if (stored > 0) return stored;
  return DEFAULT_SECURITY_DEPOSIT[normalizeVehicleCategory(category)] ?? 8000;
}

export function resolveVehicleCity(
  row: Record<string, unknown>,
  ownerCity: string
): string {
  const vehicleCity = String(row.city ?? row.vehicle_city ?? row.pickup_city ?? "").trim();
  return vehicleCity || ownerCity.trim();
}

export function buildVehicleDisplayName(row: Record<string, unknown>): string {
  return vehicleDisplayName(mapVehicleRow(row));
}

export const SELF_DRIVE_SEARCH_SQL = `
SELECT v.*
FROM public.vehicles v
WHERE (v.approval_status = 'approved' OR v.vehicle_approval_status = 'approved')
  AND (v.is_active IS DISTINCT FROM false)
  AND (v.service_self_drive IS DISTINCT FROM false)
ORDER BY v.created_at DESC
`.trim();
