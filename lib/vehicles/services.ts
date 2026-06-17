export type VehicleServiceKey =
  | "service_self_drive"
  | "service_with_driver"
  | "service_local_rental"
  | "service_return_journey";

export const VEHICLE_SERVICES: {
  key: VehicleServiceKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
}[] = [
  {
    key: "service_self_drive",
    label: "Self Drive",
    description: "Renters drive the vehicle themselves",
    defaultEnabled: true,
  },
  {
    key: "service_with_driver",
    label: "Vehicle With Driver",
    description: "Trips with a professional driver",
    defaultEnabled: true,
  },
  {
    key: "service_local_rental",
    label: "Local Rental",
    description: "Hourly or daily packages within the city",
    defaultEnabled: true,
  },
  {
    key: "service_return_journey",
    label: "Return Journey",
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

export function isServiceEnabled(
  row: Record<string, unknown>,
  service: VehicleServiceKey
): boolean {
  const value = row[service];
  if (value === undefined || value === null) {
    return DEFAULT_VEHICLE_SERVICES[service];
  }
  return Boolean(value);
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
