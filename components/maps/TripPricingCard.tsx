"use client";

import { Clock, MapPinned } from "lucide-react";
import { formatDistanceKm, formatDuration } from "@/lib/maps/format";
import type { TripPricingType } from "@/lib/pricing/trip-pricing";

type Variant = "dark" | "light";

interface TripPricingCardProps {
  tripType: TripPricingType;
  oneWayDistanceKm: number;
  totalDistanceKm: number;
  durationMinutes: number;
  variant?: Variant;
}

export default function TripPricingCard({
  tripType,
  oneWayDistanceKm,
  totalDistanceKm,
  durationMinutes,
  variant = "dark",
}: TripPricingCardProps) {
  const cardClass =
    variant === "dark"
      ? "rounded-xl border border-white/10 bg-black/20 p-3 md:p-4"
      : "rounded-xl border border-gray-200 bg-gray-50 p-3 md:p-4";

  const statClass =
    variant === "dark"
      ? "rounded-lg border border-white/10 bg-white/5 px-3 py-2"
      : "rounded-lg border border-gray-200 bg-white px-3 py-2";

  const labelClass =
    variant === "dark"
      ? "text-[10px] uppercase tracking-wide text-white/55"
      : "text-[10px] uppercase tracking-wide text-gray-500";

  const valueClass =
    variant === "dark" ? "text-sm font-semibold text-white" : "text-sm font-semibold text-secondary";

  const mutedClass = variant === "dark" ? "text-white/45" : "text-gray-400";

  const Stat = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: typeof MapPinned;
    label: string;
    value: string;
  }) => (
    <div className={statClass}>
      <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={valueClass}>{value}</p>
    </div>
  );

  if (tripType === "round_trip") {
    return (
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat icon={MapPinned} label="One Way Distance" value={formatDistanceKm(oneWayDistanceKm)} />
          <Stat icon={MapPinned} label="Round Trip Distance" value={formatDistanceKm(totalDistanceKm)} />
          <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
        </div>
        <p className={`mt-2 text-[10px] ${mutedClass}`}>
          Estimated fare is shown on each vehicle card for your selected vehicle.
        </p>
      </div>
    );
  }

  if (tripType === "return_journey") {
    return (
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={MapPinned} label="Distance" value={formatDistanceKm(totalDistanceKm)} />
          <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
        </div>
        <p className={`mt-2 text-[10px] ${mutedClass}`}>
          Per-seat fare is shown on each return journey deal card.
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={MapPinned}
          label={tripType === "multi_city" ? "Total Distance" : "Distance"}
          value={formatDistanceKm(totalDistanceKm)}
        />
        <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
      </div>
      <p className={`mt-2 text-[10px] ${mutedClass}`}>
        Estimated fare is shown on each vehicle card for your selected vehicle.
      </p>
    </div>
  );
}
