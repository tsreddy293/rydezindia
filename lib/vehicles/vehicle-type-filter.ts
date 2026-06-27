/** Search UI values mapped to canonical `vehicles.vehicle_category` stored in the database. */
const SEARCH_FILTER_TO_DB_CATEGORY: Record<string, string> = {
  "luxury car": "Luxury",
  muv: "SUV",
};

export function isAllVehicleTypesFilter(vehicleType?: string | null): boolean {
  const value = (vehicleType ?? "").trim().toLowerCase();
  return !value || value === "all" || value === "all types";
}

/** Resolves a search filter value to the exact `vehicle_category` value used in the database. */
export function resolveVehicleCategoryDbFilter(vehicleType?: string | null): string | null {
  if (isAllVehicleTypesFilter(vehicleType)) return null;
  const trimmed = String(vehicleType).trim();
  return SEARCH_FILTER_TO_DB_CATEGORY[trimmed.toLowerCase()] ?? trimmed;
}

export function vehicleRowVehicleCategory(row: Record<string, unknown>): string {
  return String(row.vehicle_category ?? row.vehicle_type ?? "").trim();
}

/** Exact category match (case-insensitive). Used only as a server-side safety check after DB filtering. */
export function vehicleRowMatchesTypeFilter(
  row: Record<string, unknown>,
  vehicleType?: string | null
): boolean {
  const category = resolveVehicleCategoryDbFilter(vehicleType);
  if (!category) return true;
  const rowCategory = vehicleRowVehicleCategory(row);
  return rowCategory.localeCompare(category, undefined, { sensitivity: "accent" }) === 0;
}

type CategoryFilterableQuery = {
  eq: (column: string, value: string) => CategoryFilterableQuery;
};

/** Applies `vehicle_category = selectedType` unless the filter is All Types. */
export function applyVehicleCategoryDbFilter<T extends CategoryFilterableQuery>(
  query: T,
  vehicleType?: string | null
): T {
  const category = resolveVehicleCategoryDbFilter(vehicleType);
  if (!category) return query;
  return query.eq("vehicle_category", category) as T;
}
