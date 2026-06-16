export interface PlaceLocation {
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface RouteBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface RouteDirectionsResult {
  distanceKm: number;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
  polyline: string;
  bounds: RouteBounds;
  cached?: boolean;
}

export type SearchServiceMode =
  | "return_journey"
  | "with_driver"
  | "self_drive"
  | "local_rental";

export interface LocationQueryParams {
  pickupCity?: string;
  dropCity?: string;
  pickupLat?: string;
  pickupLng?: string;
  pickupAddress?: string;
  pickupPlaceId?: string;
  dropLat?: string;
  dropLng?: string;
  dropAddress?: string;
  dropPlaceId?: string;
}
