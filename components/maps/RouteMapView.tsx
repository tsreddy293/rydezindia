"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/maps/GoogleMapsProvider";
import { MAP_DARK_STYLE } from "@/lib/maps/constants";
import { decodePolyline } from "@/lib/maps/polyline";
import type { RouteBounds, RouteDirectionsResult } from "@/lib/maps/types";

interface RouteMapViewProps {
  route: RouteDirectionsResult | null;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  variant?: "dark" | "light";
  className?: string;
}

const containerClass = "h-48 w-full overflow-hidden rounded-xl sm:h-56 md:h-64";

export default function RouteMapView({
  route,
  origin,
  destination,
  variant = "dark",
  className = "",
}: RouteMapViewProps) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const path = useMemo(() => {
    if (!route?.polyline) return [];
    return decodePolyline(route.polyline);
  }, [route?.polyline]);

  const center = useMemo(() => {
    if (path.length > 0) return path[Math.floor(path.length / 2)];
    if (origin && destination) {
      return {
        lat: (origin.lat + destination.lat) / 2,
        lng: (origin.lng + destination.lng) / 2,
      };
    }
    return origin ?? destination ?? { lat: 17.385, lng: 78.4867 };
  }, [destination, origin, path]);

  useEffect(() => {
    if (!map || !route?.bounds) return;
    fitBounds(map, route.bounds);
  }, [map, route?.bounds]);

  if (!isLoaded) {
    return (
      <div
        className={`${containerClass} flex items-center justify-center border ${
          variant === "dark"
            ? "border-white/10 bg-black/20 text-white/50"
            : "border-gray-200 bg-gray-50 text-gray-400"
        } ${className}`}
      >
        Loading map…
      </div>
    );
  }

  if (!route && (!origin || origin.lat === 0)) {
    return (
      <div
        className={`${containerClass} flex items-center justify-center border ${
          variant === "dark"
            ? "border-white/10 bg-black/20 text-white/50"
            : "border-gray-200 bg-gray-50 text-gray-400"
        } ${className}`}
      >
        Select both locations from autocomplete to preview your route
      </div>
    );
  }

  if (!route && origin && destination && origin.lat !== 0 && destination.lat !== 0) {
    return (
      <div
        className={`${containerClass} flex items-center justify-center border ${
          variant === "dark"
            ? "border-white/10 bg-black/20 text-white/50"
            : "border-gray-200 bg-gray-50 text-gray-400"
        } ${className}`}
      >
        Calculating route map…
      </div>
    );
  }

  return (
    <div className={`${containerClass} ${className}`}>
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={center}
        zoom={7}
        onLoad={setMap}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          styles: variant === "dark" ? MAP_DARK_STYLE : undefined,
          gestureHandling: "cooperative",
        }}
      >
        {path.length > 0 ? (
          <Polyline
            path={path}
            options={{
              strokeColor: "#06b6d4",
              strokeOpacity: 0.95,
              strokeWeight: 5,
            }}
          />
        ) : null}
        {origin && origin.lat !== 0 ? (
          <Marker position={origin} label={{ text: "A", color: "#fff" }} />
        ) : null}
        {destination && destination.lat !== 0 ? (
          <Marker position={destination} label={{ text: "B", color: "#fff" }} />
        ) : null}
      </GoogleMap>
    </div>
  );
}

function fitBounds(map: google.maps.Map, bounds: RouteBounds) {
  const googleBounds = new google.maps.LatLngBounds(
    bounds.southwest,
    bounds.northeast
  );
  map.fitBounds(googleBounds, 48);
}
