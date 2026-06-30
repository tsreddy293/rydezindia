"use client";

import { BadgeCheck, Car, Fuel, Gauge, Users } from "lucide-react";
import type { SelfDriveResult } from "@/types/database";

interface Props {
  listing: SelfDriveResult;
}

function formatLabel(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === "" || value === "-") return null;
  return String(value);
}

function formatCategory(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SelfDriveVehicleCard({ listing }: Props) {
  const year = listing.vehicle_year ? String(listing.vehicle_year) : null;
  const fuel = formatLabel(listing.fuel_type);
  const transmission = formatLabel(listing.transmission);
  const seats = listing.seats ? `${listing.seats} Seater` : null;
  const category = formatCategory(listing.vehicle_type);

  const specs = [
    year ? { icon: Car, label: "Year", value: year } : null,
    fuel ? { icon: Fuel, label: "Fuel", value: fuel } : null,
    transmission ? { icon: Gauge, label: "Transmission", value: transmission } : null,
    seats ? { icon: Users, label: "Capacity", value: seats } : null,
  ].filter(Boolean) as Array<{ icon: typeof Car; label: string; value: string }>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vehicle</p>
          <h2 className="mt-1 text-xl font-bold text-secondary">{listing.vehicle_name}</h2>
          <p className="mt-0.5 text-sm font-medium text-primary">{category}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified Vehicle
        </span>
      </div>

      {specs.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
