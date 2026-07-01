/** Preserve booking URL (including search filters) for login/KYC redirects. */

import { bookingLoginRedirectUrl } from "@/lib/auth/booking-route-guard";

export interface BookingPageSearchParams {
  type?: string;
  tripType?: string;
  package?: string;
  extraHours?: string;
  extraKm?: string;
  distanceKm?: string;
  pickupCity?: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
}

export function buildBookingReturnPath(id: string, params: BookingPageSearchParams): string {
  const qs = new URLSearchParams();
  if (params.type?.trim()) qs.set("type", params.type.trim());
  if (params.tripType?.trim()) qs.set("tripType", params.tripType.trim());
  if (params.package?.trim()) qs.set("package", params.package.trim());
  if (params.extraHours?.trim()) qs.set("extraHours", params.extraHours.trim());
  if (params.extraKm?.trim()) qs.set("extraKm", params.extraKm.trim());
  if (params.distanceKm?.trim()) qs.set("distanceKm", params.distanceKm.trim());
  if (params.pickupCity?.trim()) qs.set("pickupCity", params.pickupCity.trim());
  if (params.date?.trim()) qs.set("date", params.date.trim());
  if (params.time?.trim()) qs.set("time", params.time.trim());
  if (params.returnDate?.trim()) qs.set("returnDate", params.returnDate.trim());
  if (params.returnTime?.trim()) qs.set("returnTime", params.returnTime.trim());

  const query = qs.toString();
  return query ? `/booking/${id}?${query}` : `/booking/${id}`;
}

export function bookingAuthLoginPath(returnPath: string): string {
  return bookingLoginRedirectUrl(returnPath);
}
