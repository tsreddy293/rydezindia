/** Self-drive rental: daily rent + platform fee + GST. Security deposit is separate. */

export const SELF_DRIVE_PLATFORM_FEE_PERCENT = 5;
/** GST applied on the platform fee (18% × ₹75 = ₹14 for a ₹1500 daily rent). */
export const SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT = 18;

export interface SelfDrivePricingResult {
  dailyRent: number;
  platformFee: number;
  gst: number;
  payableAmount: number;
  securityDeposit: number;
}

export function calculateSelfDrivePricing(
  dailyRent: number,
  securityDeposit = 0
): SelfDrivePricingResult {
  const normalizedRent = Math.max(0, Math.round(dailyRent));
  const platformFee = Math.round(normalizedRent * (SELF_DRIVE_PLATFORM_FEE_PERCENT / 100));
  const gst = Math.round(platformFee * (SELF_DRIVE_GST_ON_PLATFORM_FEE_PERCENT / 100));
  const payableAmount = normalizedRent + platformFee + gst;

  return {
    dailyRent: normalizedRent,
    platformFee,
    gst,
    payableAmount,
    securityDeposit: Math.max(0, Math.round(securityDeposit)),
  };
}

export function resolveSelfDriveDailyRent(listing: {
  price?: number;
  daily_rent?: number;
}): number {
  const rent = listing.daily_rent || listing.price || 0;
  return Math.max(0, Math.round(rent));
}
