export const DEFAULT_DRIVER_RATE_PER_KM = 14;
export const RETURN_JOURNEY_SAVINGS_PERCENT = 40;
export const ROUTE_DEBOUNCE_MS = 300;
export const ROUTE_CACHE_TTL_MS = 60 * 60 * 1000;

export const LOCAL_RENTAL_PACKAGES = [
  {
    key: "4h_40km",
    label: "4 Hours / 40 KM",
    hours: 4,
    km: 40,
    basePrice: 1200,
  },
  {
    key: "8h_80km",
    label: "8 Hours / 80 KM",
    hours: 8,
    km: 80,
    basePrice: 2200,
  },
  {
    key: "12h_120km",
    label: "12 Hours / 120 KM",
    hours: 12,
    km: 120,
    basePrice: 3200,
  },
  {
    key: "full_day",
    label: "Full Day",
    hours: 24,
    km: 250,
    basePrice: 4500,
  },
] as const;

export type LocalRentalPackageKey = (typeof LOCAL_RENTAL_PACKAGES)[number]["key"];

export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export const MAP_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1f3c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3ff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a2540" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2563eb" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a2540" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];
