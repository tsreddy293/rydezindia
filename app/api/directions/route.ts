import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsServerKey } from "@/lib/maps/env";
import { buildRouteCacheKey, getCachedRoute, setCachedRoute } from "@/lib/maps/route-cache";
import type { RouteDirectionsResult } from "@/lib/maps/types";

interface GoogleDirectionsLeg {
  distance?: { value: number; text: string };
  duration?: { value: number; text: string };
}

interface GoogleDirectionsRoute {
  legs?: GoogleDirectionsLeg[];
  overview_polyline?: { points: string };
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface GoogleDirectionsResponse {
  status: string;
  routes?: GoogleDirectionsRoute[];
  error_message?: string;
}

function parseCoordinate(value: string | null, name: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseWaypoints(raw: string | null): { lat: number; lng: number }[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((pair) => {
      const [lat, lng] = pair.split(",").map(Number);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { lat, lng };
    })
    .filter((point): point is { lat: number; lng: number } => point !== null);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const originLat = parseCoordinate(searchParams.get("originLat"), "originLat");
  const originLng = parseCoordinate(searchParams.get("originLng"), "originLng");
  const destLat = parseCoordinate(searchParams.get("destLat"), "destLat");
  const destLng = parseCoordinate(searchParams.get("destLng"), "destLng");
  const waypoints = parseWaypoints(searchParams.get("waypoints"));

  if ([originLat, originLng, destLat, destLng].some((value) => value === null)) {
    return NextResponse.json({ error: "Valid origin and destination coordinates are required." }, { status: 400 });
  }

  const origin = { lat: originLat!, lng: originLng! };
  const destination = { lat: destLat!, lng: destLng! };
  const cacheKey = buildRouteCacheKey(origin, destination, waypoints);
  const cached = getCachedRoute(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  }

  const apiKey = getGoogleMapsServerKey();
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key is not configured." }, { status: 503 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("region", "in");
  url.searchParams.set("key", apiKey);
  if (waypoints.length > 0) {
    url.searchParams.set(
      "waypoints",
      waypoints.map((point) => `${point.lat},${point.lng}`).join("|")
    );
  }

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  const payload = (await response.json()) as GoogleDirectionsResponse;

  if (payload.status !== "OK" || !payload.routes?.[0]) {
    const googleError = payload.error_message ?? payload.status ?? "Unable to calculate route.";
    console.error("[directions]", googleError);
    return NextResponse.json({ error: googleError, status: payload.status }, { status: 502 });
  }

  const route = payload.routes[0];
  const totals = (route.legs ?? []).reduce(
    (acc, leg) => ({
      distanceMeters: acc.distanceMeters + (leg.distance?.value ?? 0),
      durationSeconds: acc.durationSeconds + (leg.duration?.value ?? 0),
    }),
    { distanceMeters: 0, durationSeconds: 0 }
  );

  const result: RouteDirectionsResult = {
    distanceKm: totals.distanceMeters / 1000,
    durationMinutes: totals.durationSeconds / 60,
    durationText: formatDurationText(totals.durationSeconds),
    distanceText: `${(totals.distanceMeters / 1000).toFixed(1)} km`,
    polyline: route.overview_polyline?.points ?? "",
    bounds: route.bounds ?? {
      northeast: destination,
      southwest: origin,
    },
  };

  setCachedRoute(cacheKey, result);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}

function formatDurationText(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${Math.max(minutes, 1)} mins`;
  return minutes > 0 ? `${hours} hr ${minutes} mins` : `${hours} hr`;
}
