export type VehicleServiceKey =
  | "service_self_drive"
  | "service_with_driver"
  | "service_local_rental"
  | "service_return_journey";

export const VEHICLE_SERVICES: {
  key: VehicleServiceKey;
  label: string;
  badgeLabel: string;
  badgeClass: string;
  description: string;
  defaultEnabled: boolean;
}[] = [
  {
    key: "service_self_drive",
    label: "Self Drive",
    badgeLabel: "Self Drive",
    badgeClass: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    description: "Renters drive the vehicle themselves",
    defaultEnabled: true,
  },
  {
    key: "service_with_driver",
    label: "Vehicle With Driver",
    badgeLabel: "With Driver",
    badgeClass: "bg-sky-50 text-sky-800 ring-sky-200/80",
    description: "Trips with a professional driver",
    defaultEnabled: true,
  },
  {
    key: "service_local_rental",
    label: "Local Rental (Hourly)",
    badgeLabel: "Local",
    badgeClass: "bg-amber-50 text-amber-900 ring-amber-200/80",
    description: "Hourly or daily packages within the city",
    defaultEnabled: true,
  },
  {
    key: "service_return_journey",
    label: "Return Journey",
    badgeLabel: "Return",
    badgeClass: "bg-violet-50 text-violet-800 ring-violet-200/80",
    description: "Discounted return-route trips (optional)",
    defaultEnabled: false,
  },
];

export interface VehicleServiceAvailability {
  service_self_drive: boolean;
  service_with_driver: boolean;
  service_local_rental: boolean;
  service_return_journey: boolean;
}

export const DEFAULT_VEHICLE_SERVICES: VehicleServiceAvailability = {
  service_self_drive: true,
  service_with_driver: true,
  service_local_rental: true,
  service_return_journey: false,
};

const LEGACY_SERVICE_TYPE_ALIASES: Record<VehicleServiceKey, string[]> = {
  service_self_drive: ["self_drive", "self-drive", "selfdrive"],
  service_with_driver: ["with_driver", "with-driver", "driver", "with driver"],
  service_local_rental: ["local_rental", "local-rental", "local", "hourly"],
  service_return_journey: ["return_journey", "return-journey", "return"],
};

function legacyServiceTypeMatches(service: VehicleServiceKey, legacyType: string): boolean {
  const normalized = legacyType.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return LEGACY_SERVICE_TYPE_ALIASES[service].some((alias) => {
    const aliasNorm = alias.replace(/-/g, "_");
    return normalized === aliasNorm || normalized.includes(aliasNorm);
  });
}

function hasBooleanServiceColumns(row: Record<string, unknown>): boolean {
  return (
    row.service_self_drive !== undefined ||
    row.service_with_driver !== undefined ||
    row.service_local_rental !== undefined ||
    row.service_return_journey !== undefined
  );
}

export function isServiceEnabled(
  row: Record<string, unknown>,
  service: VehicleServiceKey
): boolean {
  if (hasBooleanServiceColumns(row)) {
    const value = row[service];
    if (value === undefined || value === null) {
      return DEFAULT_VEHICLE_SERVICES[service];
    }
    return Boolean(value);
  }

  const legacyType = String(row.service_type ?? "").trim();
  if (legacyType) {
    return legacyServiceTypeMatches(service, legacyType);
  }

  return DEFAULT_VEHICLE_SERVICES[service];
}

export function parseServiceAvailability(formData: FormData): VehicleServiceAvailability {
  return {
    service_self_drive: formData.get("service_self_drive") === "on",
    service_with_driver: formData.get("service_with_driver") === "on",
    service_local_rental: formData.get("service_local_rental") === "on",
    service_return_journey: formData.get("service_return_journey") === "on",
  };
}

export function parseServiceAvailabilityFromRow(
  row: Record<string, unknown>
): VehicleServiceAvailability {
  return {
    service_self_drive: isServiceEnabled(row, "service_self_drive"),
    service_with_driver: isServiceEnabled(row, "service_with_driver"),
    service_local_rental: isServiceEnabled(row, "service_local_rental"),
    service_return_journey: isServiceEnabled(row, "service_return_journey"),
  };
}

export function serviceAvailabilityPayload(
  services: VehicleServiceAvailability
): Record<string, boolean> {
  return { ...services };
}

export function serviceAvailabilityLabel(services: VehicleServiceAvailability): string {
  return VEHICLE_SERVICES.filter((s) => services[s.key])
    .map((s) => s.label)
    .join(", ");
}
