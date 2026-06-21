/** Build self-drive booking URL with search params for pre-fill. */

export interface SelfDriveBookingSearchParams {
  pickupCity?: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
}

export function buildSelfDriveBookingHref(
  listingId: string,
  params: SelfDriveBookingSearchParams
): string {
  const qs = new URLSearchParams({ type: "self_drive" });
  if (params.pickupCity?.trim()) qs.set("pickupCity", params.pickupCity.trim());
  if (params.date?.trim()) qs.set("date", params.date.trim());
  if (params.time?.trim()) qs.set("time", params.time.trim());
  if (params.returnDate?.trim()) qs.set("returnDate", params.returnDate.trim());
  if (params.returnTime?.trim()) qs.set("returnTime", params.returnTime.trim());
  return `/booking/${listingId}?${qs.toString()}`;
}

export function parseSelfDriveBookingSearchParams(searchParams: {
  pickupCity?: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
}) {
  return {
    pickupCity: searchParams.pickupCity ?? "",
    pickupDate: searchParams.date ?? "",
    pickupTime: searchParams.time ?? "",
    returnDate: searchParams.returnDate ?? "",
    returnTime: searchParams.returnTime ?? "",
  };
}
