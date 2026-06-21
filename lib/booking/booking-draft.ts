/** Client-side booking search draft — survives login redirect via sessionStorage. */

export const BOOKING_DRAFT_STORAGE_KEY = "rydez_booking_search_draft";

export interface BookingSearchDraft {
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  serviceType?: string;
  savedAt: string;
}

export function emptyBookingSearchDraft(): BookingSearchDraft {
  return {
    pickupLocation: "",
    dropLocation: "",
    pickupDate: "",
    pickupTime: "",
    returnDate: "",
    returnTime: "",
    savedAt: "",
  };
}

export function saveBookingSearchDraft(partial: Partial<BookingSearchDraft>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadBookingSearchDraft();
    const next: BookingSearchDraft = {
      ...existing,
      ...partial,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadBookingSearchDraft(): BookingSearchDraft {
  if (typeof window === "undefined") return emptyBookingSearchDraft();
  try {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    if (!raw) return emptyBookingSearchDraft();
    const parsed = JSON.parse(raw) as Partial<BookingSearchDraft>;
    return { ...emptyBookingSearchDraft(), ...parsed };
  } catch {
    return emptyBookingSearchDraft();
  }
}

export function bookingDraftFromSearchParams(params: {
  pickupCity?: string;
  dropCity?: string;
  fromCity?: string;
  toCity?: string;
  date?: string;
  time?: string;
  returnDate?: string;
  returnTime?: string;
  serviceType?: string;
}): Partial<BookingSearchDraft> {
  const pickup = params.pickupCity || params.fromCity || "";
  const drop = params.dropCity || params.toCity || "";
  return {
    pickupLocation: pickup,
    dropLocation: drop,
    pickupDate: params.date ?? "",
    pickupTime: params.time ?? "",
    returnDate: params.returnDate ?? "",
    returnTime: params.returnTime ?? "",
    serviceType: params.serviceType,
  };
}

export function persistSearchDraftFromFilters(
  filters: Parameters<typeof bookingDraftFromSearchParams>[0],
  overrides?: Partial<BookingSearchDraft>
): void {
  saveBookingSearchDraft({
    ...bookingDraftFromSearchParams(filters),
    ...overrides,
  });
}
