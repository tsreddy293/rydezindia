"use client";

import RouteMapView from "@/components/maps/RouteMapView";
import TripPricingCard from "@/components/maps/TripPricingCard";
import { useRouteDirections } from "@/hooks/useRouteDirections";
import type { PlaceLocation, SearchServiceMode } from "@/lib/maps/types";
import { formatIndianCurrency } from "@/lib/maps/format";
import {
  detectTripType,
  mapDriverTripTypeLabel,
  type TripPricingType,
} from "@/lib/pricing/trip-pricing";
import { useMemo, useEffect } from "react";

export type DriverTripTypeKey = "one_way" | "round_trip" | "multi_city";

interface RouteInsightsPanelProps {
  origin: PlaceLocation | null;
  destination: PlaceLocation | null;
  waypoints?: PlaceLocation[];
  mode: SearchServiceMode;
  variant?: "dark" | "light";
  localPackagePrice?: number;
  driverTripType?: DriverTripTypeKey;
  tripTypeLabel?: string;
  cityNames?: string[];
  className?: string;
  onRouteUpdate?: (data: { distanceKm: number }) => void;
}

function resolveTripPricingType(
  mode: SearchServiceMode,
  driverTripType?: DriverTripTypeKey,
  tripTypeLabel?: string,
  cityNames: string[] = []
): TripPricingType {
  if (mode === "return_journey") return "return_journey";

  const mappedLabel = mapDriverTripTypeLabel(tripTypeLabel);
  if (mappedLabel) return mappedLabel;
  if (driverTripType) return driverTripType;
  if (cityNames.length > 0) return detectTripType(cityNames);

  return "one_way";
}

export default function RouteInsightsPanel({
  origin,
  destination,
  waypoints = [],
  mode,
  variant = "dark",
  localPackagePrice,
  driverTripType,
  tripTypeLabel,
  cityNames = [],
  className = "",
  onRouteUpdate,
}: RouteInsightsPanelProps) {
  const needsRoute = mode === "with_driver" || mode === "return_journey";
  const { route, loading, error, canFetch } = useRouteDirections(
    origin,
    destination,
    waypoints,
    needsRoute
  );

  const pricingType = useMemo(
    () => resolveTripPricingType(mode, driverTripType, tripTypeLabel, cityNames),
    [cityNames, driverTripType, mode, tripTypeLabel]
  );

  useEffect(() => {
    if (route && onRouteUpdate) {
      onRouteUpdate({ distanceKm: route.distanceKm });
    }
  }, [route, onRouteUpdate]);

  if (!canFetch && mode !== "local_rental") {
    return null;
  }

  if (mode === "local_rental" && !origin?.label) {
    return null;
  }

  const cardClass =
    variant === "dark"
      ? "rounded-xl border border-white/10 bg-black/20 p-3 md:p-4"
      : "rounded-xl border border-gray-200 bg-gray-50 p-3 md:p-4";

  const labelClass =
    variant === "dark"
      ? "text-[10px] uppercase tracking-wide text-white/55"
      : "text-[10px] uppercase tracking-wide text-gray-500";

  const oneWayDistanceKm = route?.distanceKm ?? 0;
  const totalDistanceKm =
    pricingType === "round_trip" ? oneWayDistanceKm * 2 : oneWayDistanceKm;

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
          {loading ? (
            <div className={cardClass}>
              <p className={variant === "dark" ? "text-xs text-white/60" : "text-xs text-gray-500"}>
                Calculating route…
              </p>
            </div>
          ) : error ? (
            <div className={cardClass}>
              <div className="space-y-1">
                <p className="text-xs text-amber-400">{error}</p>
                <p className={variant === "dark" ? "text-[10px] text-white/45" : "text-[10px] text-gray-400"}>
                  Enable Directions API in Google Cloud and pick both locations from the autocomplete list.
                </p>
              </div>
            </div>
          ) : route ? (
            <TripPricingCard
              tripType={pricingType}
              oneWayDistanceKm={oneWayDistanceKm}
              totalDistanceKm={totalDistanceKm}
              durationMinutes={route.durationMinutes}
              variant={variant}
            />
          ) : null}
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
