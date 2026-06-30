"use client";

import { Calendar, MapPin, Pencil } from "lucide-react";
import FormField from "@/components/forms/FormField";
import { formatDate } from "@/lib/utils";

interface TripValues {
  pickupCity: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  travelPlan: string;
}

interface Props {
  values: TripValues;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChange: <K extends keyof TripValues>(key: K, value: TripValues[K]) => void;
}

function formatTimeLabel(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${suffix}`;
}

export default function SelfDriveTripSummary({
  values,
  editing,
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
          label="Pickup City"
          name="pickup_city"
          required
          value={values.pickupCity}
          onChange={(e) => onChange("pickupCity", e.target.value)}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Return Date"
            name="return_date"
            type="date"
            value={values.returnDate}
            onChange={(e) => onChange("returnDate", e.target.value)}
          />
          <FormField
            label="Return Time"
            name="return_time"
            type="time"
            value={values.returnTime}
            onChange={(e) => onChange("returnTime", e.target.value)}
          />
        </div>

        <FormField
          label="Travel Plan (optional)"
          name="travel_plan"
          as="textarea"
          placeholder="Route or cities you plan to visit..."
          value={values.travelPlan}
          onChange={(e) => onChange("travelPlan", e.target.value)}
          rows={2}
        />
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
              {values.pickupCity || "—"}
            </p>
            <p className="flex items-center gap-1.5 pl-5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {values.pickupDate ? formatDate(values.pickupDate) : "—"}
            </p>
            <p className="pl-5 text-gray-600">{formatTimeLabel(values.pickupTime)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Return</p>
          <div className="mt-2 space-y-1.5 text-sm text-gray-700">
            <p className="flex items-center gap-1.5 pl-5 sm:pl-0">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {values.returnDate ? formatDate(values.returnDate) : "—"}
            </p>
            <p className="pl-5 sm:pl-0 text-gray-600">{formatTimeLabel(values.returnTime)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
