export type VehicleTripTypeKey =
  | "trip_one_way"
  | "trip_round_trip"
  | "trip_multi_city"
  | "trip_airport_transfer"
  | "trip_local_rental";

export const VEHICLE_TRIP_TYPES: {
  key: VehicleTripTypeKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
}[] = [
  {
    key: "trip_one_way",
    label: "One Way",
    description: "Point-to-point trips without a return leg",
    defaultEnabled: true,
  },
  {
    key: "trip_round_trip",
    label: "Round Trip",
    description: "Outstation trips with return on the same booking",
    defaultEnabled: true,
  },
  {
    key: "trip_multi_city",
    label: "Multi City",
    description: "Routes covering three or more cities",
    defaultEnabled: false,
  },
  {
    key: "trip_airport_transfer",
    label: "Airport Transfer",
    description: "Pickup or drop at airports",
    defaultEnabled: false,
  },
  {
    key: "trip_local_rental",
    label: "Local Rental",
    description: "Hourly or daily packages within a city",
    defaultEnabled: true,
  },
];

export interface VehicleTripTypeAvailability {
  trip_one_way: boolean;
  trip_round_trip: boolean;
  trip_multi_city: boolean;
  trip_airport_transfer: boolean;
  trip_local_rental: boolean;
}

export const DEFAULT_VEHICLE_TRIP_TYPES: VehicleTripTypeAvailability = {
  trip_one_way: true,
  trip_round_trip: true,
  trip_multi_city: false,
  trip_airport_transfer: false,
  trip_local_rental: true,
};

export function isTripTypeEnabled(
  row: Record<string, unknown>,
  tripType: VehicleTripTypeKey
): boolean {
  const value = row[tripType];
  if (value === undefined || value === null) {
    return DEFAULT_VEHICLE_TRIP_TYPES[tripType];
  }
  return Boolean(value);
}

export function parseTripTypesFromFormData(formData: FormData): VehicleTripTypeAvailability {
  return {
    trip_one_way: formData.get("trip_one_way") === "on",
    trip_round_trip: formData.get("trip_round_trip") === "on",
    trip_multi_city: formData.get("trip_multi_city") === "on",
    trip_airport_transfer: formData.get("trip_airport_transfer") === "on",
    trip_local_rental: formData.get("trip_local_rental") === "on",
  };
}

export function parseTripTypesFromRow(row: Record<string, unknown>): VehicleTripTypeAvailability {
  return {
    trip_one_way: isTripTypeEnabled(row, "trip_one_way"),
    trip_round_trip: isTripTypeEnabled(row, "trip_round_trip"),
    trip_multi_city: isTripTypeEnabled(row, "trip_multi_city"),
    trip_airport_transfer: isTripTypeEnabled(row, "trip_airport_transfer"),
    trip_local_rental: isTripTypeEnabled(row, "trip_local_rental"),
  };
}

export function tripTypesPayload(
  tripTypes: VehicleTripTypeAvailability
): Record<string, boolean> {
  return { ...tripTypes };
}

/** Map hero/search tripType labels to DB boolean column keys. */
export function resolveTripTypeKeyFromSearchLabel(
  tripType?: string | null
): VehicleTripTypeKey | null {
  if (!tripType?.trim()) return null;
  const normalized = tripType.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();

  if (normalized.includes("local") && normalized.includes("rental")) return "trip_local_rental";
  if (normalized.includes("round")) return "trip_round_trip";
  if (normalized.includes("multi")) return "trip_multi_city";
  if (normalized.includes("airport")) return "trip_airport_transfer";
  if (normalized.includes("one")) return "trip_one_way";

  return null;
}

export function vehicleSupportsSearchTrip(
  row: Record<string, unknown>,
  tripTypeKey: VehicleTripTypeKey | null
): boolean {
  if (!tripTypeKey) return true;
  return isTripTypeEnabled(row, tripTypeKey);
}
