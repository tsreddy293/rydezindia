"use client";

import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";

interface Props {
  services?: Partial<VehicleServiceAvailability>;
  disabled?: boolean;
  namePrefix?: string;
}

export default function VehicleServiceAvailabilityFields({
  services,
  disabled,
}: Props) {
  return (
    <section className="space-y-4 border-t pt-6">
      <div>
        <h3 className="font-semibold text-secondary">Service Availability</h3>
        <p className="text-sm text-gray-500 mt-1">
          Choose which booking services this vehicle should appear in after admin approval.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {VEHICLE_SERVICES.map((service) => {
          const checked = services?.[service.key] ?? service.defaultEnabled;
          return (
            <label
              key={service.key}
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                checked ? "border-primary/30 bg-primary/5" : "border-gray-200 bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40"}`}
            >
              <input
                type="checkbox"
                name={service.key}
                defaultChecked={checked}
                disabled={disabled}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-sm font-medium text-secondary">{service.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{service.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
