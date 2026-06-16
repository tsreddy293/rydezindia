import type { RouteDirectionsResult } from "./types";
import { ROUTE_CACHE_TTL_MS } from "./constants";

interface CacheEntry {
  data: RouteDirectionsResult;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();

export function buildRouteCacheKey(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[] = []
): string {
  const waypointKey = waypoints.map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join("|");
  return `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}${waypointKey ? `|${waypointKey}` : ""}`;
}

export function getCachedRoute(key: string): RouteDirectionsResult | null {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    routeCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

export function setCachedRoute(key: string, data: RouteDirectionsResult): void {
  routeCache.set(key, {
    data,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  });
}

export function clearRouteCache(): void {
  routeCache.clear();
}
