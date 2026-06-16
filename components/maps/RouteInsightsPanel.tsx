"use client";

import { Clock, IndianRupee, MapPinned, Percent, Users } from "lucide-react";
import RouteMapView from "@/components/maps/RouteMapView";
import { useRouteDirections } from "@/hooks/useRouteDirections";
import {
  DEFAULT_DRIVER_RATE_PER_KM,
  RETURN_JOURNEY_SAVINGS_PERCENT,
} from "@/lib/maps/constants";
import {
  calculateSavingsPercent,
  estimateDriverFare,
  estimateStandardFare,
  formatDistanceKm,
  formatDuration,
  formatIndianCurrency,
} from "@/lib/maps/format";
import type { PlaceLocation, SearchServiceMode } from "@/lib/maps/types";

interface RouteInsightsPanelProps {
  origin: PlaceLocation | null;
  destination: PlaceLocation | null;
  waypoints?: PlaceLocation[];
  mode: SearchServiceMode;
  variant?: "dark" | "light";
  ratePerKm?: number;
  availableSeats?: number;
  localPackagePrice?: number;
  className?: string;
}

export default function RouteInsightsPanel({
  origin,
  destination,
  waypoints = [],
  mode,
  variant = "dark",
  ratePerKm = DEFAULT_DRIVER_RATE_PER_KM,
  availableSeats,
  localPackagePrice,
  className = "",
}: RouteInsightsPanelProps) {
  const needsRoute = mode === "with_driver" || mode === "return_journey";
  const { route, loading, error, canFetch } = useRouteDirections(
    origin,
    destination,
    waypoints,
    needsRoute
  );

  if (!canFetch && mode !== "local_rental") {
    return null;
  }

  if (mode === "local_rental" && !origin?.label) {
    return null;
  }

  const estimatedFare = route ? estimateDriverFare(route.distanceKm, ratePerKm) : null;
  const standardFare = route ? estimateStandardFare(route.distanceKm, ratePerKm) : null;
  const savingsPercent = route
    ? calculateSavingsPercent(estimatedFare ?? 0, standardFare ?? 0) || RETURN_JOURNEY_SAVINGS_PERCENT
    : RETURN_JOURNEY_SAVINGS_PERCENT;

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

  return (
    <div className={`space-y-3 ${className}`}>
      {canFetch ? (
        <>
          <RouteMapView
            route={route}
            origin={origin}
            destination={destination ?? origin}
            variant={variant}
          />
          <div className={cardClass}>
            {loading ? (
              <p className={variant === "dark" ? "text-xs text-white/60" : "text-xs text-gray-500"}>
                Calculating route…
              </p>
            ) : error ? (
              <div className="space-y-1">
                <p className="text-xs text-amber-400">{error}</p>
                <p className={variant === "dark" ? "text-[10px] text-white/45" : "text-[10px] text-gray-400"}>
                  Enable Directions API in Google Cloud and pick both locations from the autocomplete list.
                </p>
              </div>
            ) : route ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className={statClass}>
                  <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
                    <MapPinned className="h-3 w-3" />
                    Distance
                  </div>
                  <p className={valueClass}>{formatDistanceKm(route.distanceKm)}</p>
                </div>
                <div className={statClass}>
                  <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
                    <Clock className="h-3 w-3" />
                    Travel Time
                  </div>
                  <p className={valueClass}>{formatDuration(route.durationMinutes)}</p>
                </div>
                {mode === "with_driver" && estimatedFare ? (
                  <div className={statClass}>
                    <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
                      <IndianRupee className="h-3 w-3" />
                      Est. Fare
                    </div>
                    <p className={valueClass}>{formatIndianCurrency(estimatedFare)}</p>
                    <p className={`mt-0.5 text-[10px] ${variant === "dark" ? "text-white/45" : "text-gray-400"}`}>
                      @ ₹{ratePerKm}/km
                    </p>
                  </div>
                ) : null}
                {mode === "return_journey" ? (
                  <>
                    <div className={statClass}>
                      <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
                        <Percent className="h-3 w-3" />
                        Savings
                      </div>
                      <p className={`${valueClass} text-accent`}>Up to {savingsPercent}%</p>
                    </div>
                    {typeof availableSeats === "number" ? (
                      <div className={statClass}>
                        <div className={`mb-1 flex items-center gap-1 ${labelClass}`}>
                          <Users className="h-3 w-3" />
                          Seats
                        </div>
                        <p className={valueClass}>{availableSeats} available</p>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {mode === "local_rental" && localPackagePrice ? (
        <div className={cardClass}>
          <p className={labelClass}>Package starting from</p>
          <p className={`mt-1 text-lg font-bold ${variant === "dark" ? "text-accent" : "text-primary"}`}>
            {formatIndianCurrency(localPackagePrice)}
          </p>
          <p className={`mt-1 text-xs ${variant === "dark" ? "text-white/55" : "text-gray-500"}`}>
            Pickup location selected. Package includes driver, fuel, and local city limits.
          </p>
        </div>
      ) : null}
    </div>
  );
}
