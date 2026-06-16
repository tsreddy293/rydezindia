"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";
import { ROUTE_DEBOUNCE_MS } from "@/lib/maps/constants";
import { formatDuration } from "@/lib/maps/format";
import { buildRouteCacheKey, getCachedRoute, setCachedRoute } from "@/lib/maps/route-cache";
import type { PlaceLocation, RouteDirectionsResult } from "@/lib/maps/types";

function hasValidCoords(place: PlaceLocation | null | undefined): place is PlaceLocation {
  return Boolean(place && place.lat !== 0 && place.lng !== 0);
}

function parseDirectionsResult(result: google.maps.DirectionsResult): RouteDirectionsResult {
  const route = result.routes[0];
  const totals = route.legs.reduce(
    (acc, leg) => ({
      distanceMeters: acc.distanceMeters + (leg.distance?.value ?? 0),
      durationSeconds: acc.durationSeconds + (leg.duration?.value ?? 0),
    }),
    { distanceMeters: 0, durationSeconds: 0 }
  );

  const bounds = route.bounds!;
  return {
    distanceKm: totals.distanceMeters / 1000,
    durationMinutes: totals.durationSeconds / 60,
    durationText: formatDuration(totals.durationSeconds / 60),
    distanceText: `${(totals.distanceMeters / 1000).toFixed(1)} km`,
    polyline: route.overview_polyline,
    bounds: {
      northeast: {
        lat: bounds.getNorthEast().lat(),
        lng: bounds.getNorthEast().lng(),
      },
      southwest: {
        lat: bounds.getSouthWest().lat(),
        lng: bounds.getSouthWest().lng(),
      },
    },
  };
}

async function fetchRouteFromServer(
  origin: PlaceLocation,
  destination: PlaceLocation,
  waypoints: PlaceLocation[]
): Promise<RouteDirectionsResult> {
  const params = new URLSearchParams({
    originLat: String(origin.lat),
    originLng: String(origin.lng),
    destLat: String(destination.lat),
    destLng: String(destination.lng),
  });

  const waypointPoints = waypoints.filter(hasValidCoords);
  if (waypointPoints.length > 0) {
    params.set(
      "waypoints",
      waypointPoints.map((point) => `${point.lat},${point.lng}`).join("|")
    );
  }

  const response = await fetch(`/api/directions?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Route lookup failed");
  }
  return payload as RouteDirectionsResult;
}

function fetchRouteFromClient(
  origin: PlaceLocation,
  destination: PlaceLocation,
  waypoints: PlaceLocation[]
): Promise<RouteDirectionsResult> {
  return new Promise((resolve, reject) => {
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: waypoints.filter(hasValidCoords).map((point) => ({
          location: { lat: point.lat, lng: point.lng },
          stopover: true,
        })),
        travelMode: google.maps.TravelMode.DRIVING,
        region: "IN",
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result?.routes[0]) {
          resolve(parseDirectionsResult(result));
          return;
        }
        reject(new Error(`Directions request failed (${status})`));
      }
    );
  });
}

export function useRouteDirections(
  origin: PlaceLocation | null,
  destination: PlaceLocation | null,
  waypoints: PlaceLocation[] = [],
  enabled: boolean
) {
  const { isLoaded } = useGoogleMaps();
  const [route, setRoute] = useState<RouteDirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canFetch =
    enabled && hasValidCoords(origin) && hasValidCoords(destination);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!canFetch) {
      setRoute(null);
      setError(null);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const waypointPoints = waypoints.filter(hasValidCoords);
      const cacheKey = buildRouteCacheKey(
        { lat: origin!.lat, lng: origin!.lng },
        { lat: destination!.lat, lng: destination!.lng },
        waypointPoints.map((point) => ({ lat: point.lat, lng: point.lng }))
      );
      const cached = getCachedRoute(cacheKey);
      if (cached) {
        setRoute(cached);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let result: RouteDirectionsResult;
        if (isLoaded && typeof google !== "undefined" && google.maps?.DirectionsService) {
          try {
            result = await fetchRouteFromClient(origin!, destination!, waypointPoints);
          } catch {
            result = await fetchRouteFromServer(origin!, destination!, waypointPoints);
          }
        } else {
          result = await fetchRouteFromServer(origin!, destination!, waypointPoints);
        }

        setCachedRoute(cacheKey, result);
        setRoute(result);
      } catch (fetchError) {
        setRoute(null);
        setError(fetchError instanceof Error ? fetchError.message : "Route lookup failed");
      } finally {
        setLoading(false);
      }
    }, ROUTE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [canFetch, destination, isLoaded, origin, waypoints]);

  return { route, loading, error, canFetch };
}
