import type { PlaceLocation } from "./types";

export function appendPlaceToParams(params: URLSearchParams, prefix: "pickup" | "drop", place: PlaceLocation | null) {
  if (!place) return;
  params.set(`${prefix}City`, place.label);
  params.set(`${prefix}Lat`, String(place.lat));
  params.set(`${prefix}Lng`, String(place.lng));
  params.set(`${prefix}Address`, place.formattedAddress);
  if (place.placeId) params.set(`${prefix}PlaceId`, place.placeId);
}

export function placeFromSearchParams(
  prefix: "pickup" | "drop",
  params: URLSearchParams | Record<string, string | undefined>
): PlaceLocation | null {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    return params[key];
  };

  const lat = Number(get(`${prefix}Lat`));
  const lng = Number(get(`${prefix}Lng`));
  const label = get(`${prefix}City`) ?? get(`${prefix}Address`) ?? "";
  const formattedAddress = get(`${prefix}Address`) ?? label;

  if (!label || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    label,
    formattedAddress,
    lat,
    lng,
    placeId: get(`${prefix}PlaceId`),
  };
}

export function buildPlaceFromParts(
  city: string,
  lat?: string,
  lng?: string,
  address?: string,
  placeId?: string
): PlaceLocation | null {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!city.trim()) return null;
  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    return {
      label: city.trim(),
      formattedAddress: address?.trim() || city.trim(),
      lat: 0,
      lng: 0,
      placeId,
    };
  }
  return {
    label: city.trim(),
    formattedAddress: address?.trim() || city.trim(),
    lat: parsedLat,
    lng: parsedLng,
    placeId,
  };
}
