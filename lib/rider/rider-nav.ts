/** Rider dashboard sidebar navigation. */

export type RiderNavIcon =
  | "layout-dashboard"
  | "calendar"
  | "wallet"
  | "heart"
  | "gift"
  | "shield"
  | "badge-check"
  | "user"
  | "life-buoy"
  | "bell";

export interface RiderNavItem {
  href: string;
  label: string;
  icon: RiderNavIcon;
  matchPrefix?: string;
  kycOnly?: boolean;
  aliases?: string[];
}

export const RIDER_SIDEBAR_NAV: RiderNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard", aliases: ["/user/dashboard"] },
  { href: "/dashboard/bookings", label: "My Bookings", icon: "calendar", matchPrefix: "/dashboard/bookings", aliases: ["/user/bookings"] },
  { href: "/dashboard/wallet", label: "Wallet", icon: "wallet", matchPrefix: "/dashboard/wallet", aliases: ["/user/wallet"] },
  { href: "/dashboard/saved", label: "Saved Vehicles", icon: "heart", matchPrefix: "/dashboard/saved", aliases: ["/user/saved"] },
  { href: "/dashboard/referrals", label: "Referrals", icon: "gift", matchPrefix: "/dashboard/referrals", aliases: ["/user/referrals"] },
  { href: "/dashboard/kyc", label: "KYC Documents", icon: "shield", matchPrefix: "/dashboard/kyc", kycOnly: true, aliases: ["/user/profile/kyc"] },
  { href: "/dashboard/verification", label: "Verification", icon: "badge-check", matchPrefix: "/dashboard/verification", kycOnly: true, aliases: ["/user/dashboard/verification"] },
  { href: "/dashboard/profile", label: "Profile", icon: "user", matchPrefix: "/dashboard/profile", aliases: ["/user/profile"] },
  { href: "/dashboard/support", label: "Support", icon: "life-buoy", matchPrefix: "/dashboard/support", aliases: ["/user/profile/safety"] },
];
