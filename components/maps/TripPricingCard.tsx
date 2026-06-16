"use client";

import { Clock, Flame, IndianRupee, MapPinned, Percent, Users } from "lucide-react";
import { formatDistanceKm, formatDuration, formatIndianCurrency } from "@/lib/maps/format";
import type { TripPricingResult } from "@/lib/pricing/trip-pricing";

type Variant = "dark" | "light";

interface TripPricingCardProps {
  pricing: TripPricingResult;
  durationMinutes: number;
  variant?: Variant;
  availableSeats?: number;
}

export default function TripPricingCard({
  pricing,
  durationMinutes,
  variant = "dark",
  availableSeats,
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

  const badgeClass =
    variant === "dark"
      ? "mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent"
      : "mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary";

  const Stat = ({
    icon: Icon,
    label,
    value,
    accent,
  }: {
    icon: typeof MapPinned;
    label: string;
    value: string;
    accent?: boolean;
  }) => (
    <div className={statClass}>
      <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`${valueClass} ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );

  if (pricing.tripType === "return_journey") {
    return (
      <div className={cardClass}>
        <div className={badgeClass}>
          <Flame className="h-3 w-3" />
          Return Journey Deal — Save {pricing.discountPercent}%
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat icon={MapPinned} label="Distance" value={formatDistanceKm(pricing.totalDistanceKm)} />
          <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
          <Stat icon={IndianRupee} label="Original Fare" value={formatIndianCurrency(pricing.baseFare)} />
          <Stat icon={Percent} label="Discount" value={`${pricing.discountPercent}%`} accent />
          <Stat icon={IndianRupee} label="You Save" value={formatIndianCurrency(pricing.savings)} accent />
          <Stat icon={IndianRupee} label="Final Fare" value={formatIndianCurrency(pricing.finalFare)} />
          {typeof availableSeats === "number" ? (
            <Stat icon={Users} label="Seats" value={`${availableSeats} available`} />
          ) : null}
        </div>
      </div>
    );
  }

  if (pricing.tripType === "round_trip") {
    return (
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat
            icon={MapPinned}
            label="One Way Distance"
            value={formatDistanceKm(pricing.oneWayDistanceKm)}
          />
          <Stat
            icon={MapPinned}
            label="Round Trip Distance"
            value={formatDistanceKm(pricing.totalDistanceKm)}
          />
          <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
          <Stat icon={IndianRupee} label="Base Fare" value={formatIndianCurrency(pricing.baseFare)} />
          <Stat icon={Percent} label="Discount" value={`${pricing.discountPercent}%`} accent />
          <Stat icon={IndianRupee} label="You Save" value={formatIndianCurrency(pricing.savings)} accent />
          <Stat icon={IndianRupee} label="Final Fare" value={formatIndianCurrency(pricing.finalFare)} />
        </div>
        <p className={`mt-2 text-[10px] ${mutedClass}`}>@ ₹{pricing.ratePerKm}/km after round-trip discount</p>
      </div>
    );
  }

  if (pricing.tripType === "multi_city") {
    return (
      <div className={cardClass}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat icon={MapPinned} label="Total Distance" value={formatDistanceKm(pricing.totalDistanceKm)} />
          <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
          <Stat icon={IndianRupee} label="Estimated Fare" value={formatIndianCurrency(pricing.finalFare)} />
        </div>
        <p className={`mt-2 text-[10px] ${mutedClass}`}>
          Multi-city trips have no discount — full route distance × ₹{pricing.ratePerKm}/km
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat icon={MapPinned} label="Distance" value={formatDistanceKm(pricing.totalDistanceKm)} />
        <Stat icon={Clock} label="Travel Time" value={formatDuration(durationMinutes)} />
        <Stat icon={IndianRupee} label="Estimated Fare" value={formatIndianCurrency(pricing.finalFare)} />
      </div>
      <p className={`mt-2 text-[10px] ${mutedClass}`}>@ ₹{pricing.ratePerKm}/km — no discount on one-way trips</p>
    </div>
  );
}
