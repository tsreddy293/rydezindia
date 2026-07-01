const MOBILE_REGEX = /^[6-9]\d{9}$/;

export function normalizeBookingMobile(value: string): string {
  return value.replace(/\s/g, "");
}

export function isValidBookingMobile(value: string): boolean {
  return MOBILE_REGEX.test(normalizeBookingMobile(value));
}

/** SMS OTP for checkout is opt-in until auth_otps + SMS delivery are deployed. */
export function isBookingOtpEnabled(): boolean {
  return process.env.BOOKING_OTP_ENABLED === "true";
}

export function isOtpInfrastructureError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the table")
  );
}

/**
 * Booking pages require rider login. Logged-in riders use account identity
 * (same as self-drive checkout) unless SMS OTP is explicitly enabled.
 */
export function shouldRequireBookingOtp(options: {
  loggedInUserId?: string | null;
}): boolean {
  if (!isBookingOtpEnabled()) return false;
  if (options.loggedInUserId) return false;
  return true;
}

/** Trust mobile on file for logged-in checkout when it matches the entered number. */
export function isLoggedInRiderMobileTrusted(input: {
  enteredMobile: string;
  profileMobile?: string | null;
}): boolean {
  const entered = normalizeBookingMobile(input.enteredMobile);
  const profile = normalizeBookingMobile(input.profileMobile ?? "");
  return Boolean(entered && profile && entered === profile && MOBILE_REGEX.test(entered));
}
