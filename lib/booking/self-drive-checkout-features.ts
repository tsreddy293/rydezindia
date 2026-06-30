/**
 * Self-drive checkout feature flags (launch vs future releases).
 * Set to true when coupon codes or wallet credits are enabled in production.
 */
export const SELF_DRIVE_CHECKOUT_FEATURES = {
  couponCode: false,
  walletBalance: false,
} as const;
