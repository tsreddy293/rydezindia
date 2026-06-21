/** Preserve booking URL (including search filters) for login/KYC redirects. */

export interface BookingPageSearchParams {
  type?: string;
  pickupCity?: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
}

export function buildBookingReturnPath(id: string, params: BookingPageSearchParams): string {
  const qs = new URLSearchParams();
  if (params.type?.trim()) qs.set("type", params.type.trim());
  if (params.pickupCity?.trim()) qs.set("pickupCity", params.pickupCity.trim());
  if (params.date?.trim()) qs.set("date", params.date.trim());
  if (params.time?.trim()) qs.set("time", params.time.trim());
  if (params.returnDate?.trim()) qs.set("returnDate", params.returnDate.trim());
  if (params.returnTime?.trim()) qs.set("returnTime", params.returnTime.trim());

  const query = qs.toString();
  return query ? `/booking/${id}?${query}` : `/booking/${id}`;
}

export function bookingAuthLoginPath(returnPath: string): string {
  return `/login/rider?redirect=${encodeURIComponent(returnPath)}`;
}
