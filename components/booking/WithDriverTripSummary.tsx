"use client";

import { Calendar, MapPin, Pencil, Route } from "lucide-react";
import FormField from "@/components/forms/FormField";
import { formatDate } from "@/lib/utils";

export interface WithDriverTripValues {
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  tripType: string;
  extraHours: number;
  extraKm: number;
}

interface Props {
  values: WithDriverTripValues;
  editing: boolean;
  isLocalRental?: boolean;
  localRentalPackageLabel?: string;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChange: <K extends keyof WithDriverTripValues>(key: K, value: WithDriverTripValues[K]) => void;
}

const TRIP_TYPE_OPTIONS = ["One Way", "Round Trip", "Multi-City", "Local Rental"];

function formatTimeLabel(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
}

export default function WithDriverTripSummary({
  values,
  editing,
  isLocalRental = false,
  localRentalPackageLabel,
  onEdit,
  onCancelEdit,
  onChange,
}: Props) {
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-secondary">Edit Trip Details</h3>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Done
          </button>
        </div>

        <FormField
          label="Pickup Location"
          name="pickup_location"
          required
          value={values.pickupLocation}
          onChange={(e) => onChange("pickupLocation", e.target.value)}
        />
        <FormField
          label="Drop Location"
          name="drop_location"
          value={values.dropLocation}
          onChange={(e) => onChange("dropLocation", e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Pickup Date"
            name="pickup_date"
            type="date"
            required
            value={values.pickupDate}
            onChange={(e) => onChange("pickupDate", e.target.value)}
          />
          <FormField
            label="Pickup Time"
            name="pickup_time"
            type="time"
            value={values.pickupTime}
            onChange={(e) => onChange("pickupTime", e.target.value)}
          />
        </div>

        {!isLocalRental ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Trip Type</span>
            <select
              value={values.tripType}
              onChange={(e) => onChange("tripType", e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            >
              {TRIP_TYPE_OPTIONS.filter((o) => o !== "Local Rental").map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {localRentalPackageLabel && (
              <p className="text-sm text-gray-600">
                Package: <span className="font-medium text-secondary">{localRentalPackageLabel}</span>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Extra Hours"
                name="extra_hours"
                type="number"
                value={String(values.extraHours)}
                onChange={(e) => onChange("extraHours", Number(e.target.value) || 0)}
              />
              <FormField
                label="Extra KM"
                name="extra_km"
                type="number"
                value={String(values.extraKm)}
                onChange={(e) => onChange("extraKm", Number(e.target.value) || 0)}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-secondary">Trip Details</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/5"
        >
          <Pencil className="h-3 w-3" />
          Edit Trip Details
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pickup</p>
          <div className="mt-2 space-y-1.5 text-sm text-gray-700">
            <p className="flex items-center gap-1.5 font-medium text-secondary">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              {values.pickupLocation || "—"}
            </p>
            <p className="flex items-center gap-1.5 pl-5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {values.pickupDate ? formatDate(values.pickupDate) : "—"}
            </p>
            <p className="pl-5 text-gray-600">{formatTimeLabel(values.pickupTime)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Drop</p>
          <div className="mt-2 space-y-1.5 text-sm text-gray-700">
            <p className="flex items-center gap-1.5 font-medium text-secondary">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              {values.dropLocation || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Trip Type</p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-secondary">
          <Route className="h-3.5 w-3.5 shrink-0 text-primary" />
          {values.tripType || "One Way"}
          {isLocalRental && localRentalPackageLabel ? ` · ${localRentalPackageLabel}` : ""}
        </p>
      </div>
    </div>
  );
}
