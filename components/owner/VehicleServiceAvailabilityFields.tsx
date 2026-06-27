"use client";

import VehicleCapabilityBadges from "@/components/vehicles/VehicleCapabilityBadges";
import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";
import { VEHICLE_TRIP_TYPES, type VehicleTripTypeAvailability } from "@/lib/vehicles/trip-types";

interface Props {
  services?: Partial<VehicleServiceAvailability>;
  tripTypes?: Partial<VehicleTripTypeAvailability>;
  disabled?: boolean;
}

function CheckboxCard({
  name,
  label,
  description,
  checked,
  disabled,
  accentClass,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  accentClass: string;
}) {
  return (
    <label
      className={`group flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
        checked
          ? `border-transparent bg-gradient-to-br ${accentClass} shadow-sm`
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-secondary dark:text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
    </label>
  );
}

export default function VehicleServiceAvailabilityFields({
  services,
  tripTypes,
  disabled,
}: Props) {
  const activeServices = VEHICLE_SERVICES.filter(
    (service) => services?.[service.key] ?? service.defaultEnabled
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-secondary dark:text-white">Service Types</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose which booking services this vehicle should appear in after admin approval.
            </p>
          </div>
          {activeServices.length > 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Preview
              </p>
              <VehicleCapabilityBadges
                services={{
                  service_self_drive: services?.service_self_drive,
                  service_with_driver: services?.service_with_driver,
                  service_local_rental: services?.service_local_rental,
                  service_return_journey: services?.service_return_journey,
                }}
                size="md"
              />
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {VEHICLE_SERVICES.map((service) => (
            <CheckboxCard
              key={service.key}
              name={service.key}
              label={service.label}
              description={service.description}
              checked={services?.[service.key] ?? service.defaultEnabled}
              disabled={disabled}
              accentClass={
                service.key === "service_self_drive"
                  ? "from-emerald-50 to-emerald-100/80"
                  : service.key === "service_with_driver"
                    ? "from-sky-50 to-sky-100/80"
                    : service.key === "service_local_rental"
                      ? "from-amber-50 to-amber-100/80"
                      : "from-violet-50 to-violet-100/80"
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
        <div>
          <h3 className="text-lg font-bold text-secondary dark:text-white">Trip Types Supported</h3>
          <p className="mt-1 text-sm text-gray-500">
            Riders only see your vehicle when their search matches a selected trip type.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VEHICLE_TRIP_TYPES.map((tripType) => (
            <CheckboxCard
              key={tripType.key}
              name={tripType.key}
              label={tripType.label}
              description={tripType.description}
              checked={tripTypes?.[tripType.key] ?? tripType.defaultEnabled}
              disabled={disabled}
              accentClass="from-gray-50 to-gray-100/90"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
