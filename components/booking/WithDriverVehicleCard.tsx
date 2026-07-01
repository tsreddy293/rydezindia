"use client";

import { BadgeCheck, Car, Fuel, Snowflake, Users } from "lucide-react";
import type { DriverVehicleResult } from "@/types/database";

interface Props {
  listing: DriverVehicleResult;
}

function formatLabel(value: string | undefined | null): string | null {
  if (!value || value === "-") return null;
  return value;
}

export default function WithDriverVehicleCard({ listing }: Props) {
  const fuel = formatLabel(listing.fuel_type);
  const seats = listing.seats ? `${listing.seats} Seater` : null;
  const ac = listing.has_ac !== false ? "AC" : "Non AC";

  const specs = [
    fuel ? { icon: Fuel, label: "Fuel", value: fuel } : null,
    seats ? { icon: Users, label: "Capacity", value: seats } : null,
    { icon: Snowflake, label: "Comfort", value: ac },
  ].filter(Boolean) as Array<{ icon: typeof Car; label: string; value: string }>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vehicle</p>
          <h2 className="mt-1 text-xl font-bold text-secondary">{listing.vehicle_name}</h2>
          <p className="mt-0.5 text-sm font-medium text-primary">{listing.vehicle_type}</p>
          {listing.owner_name && (
            <p className="mt-1 text-xs text-gray-500">Owner: {listing.owner_name}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <BadgeCheck className="h-3.5 w-3.5" />
          With Driver
        </span>
      </div>

      {specs.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {specs.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5"
            >
              <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <Icon className="h-3 w-3" />
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold capitalize text-secondary">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
