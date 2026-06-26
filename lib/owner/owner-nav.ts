export type OwnerNavIcon =
  | "layout-dashboard"
  | "zap"
  | "car"
  | "calendar"
  | "route"
  | "banknote"
  | "wallet"
  | "credit-card"
  | "bar-chart"
  | "star"
  | "shield"
  | "bell"
  | "life-buoy"
  | "log-out";

export type OwnerNavItemId =
  | "dashboard"
  | "action-center"
  | "my-vehicles"
  | "bookings"
  | "return-journey"
  | "earnings"
  | "wallet"
  | "payments"
  | "reports"
  | "reviews"
  | "kyc"
  | "notifications"
  | "support";

export interface OwnerNavItem {
  id: OwnerNavItemId;
  href: string;
  label: string;
  icon: OwnerNavIcon;
  matchPrefixes?: string[];
  matchPrefix?: string;
}

const VEHICLE_HUB_PREFIXES = [
  "/owner/my-vehicles",
  "/owner/add-vehicle",
  "/owner/edit-vehicle",
  "/owner/view-vehicle",
];

export const OWNER_SIDEBAR_NAV: OwnerNavItem[] = [
  { id: "dashboard", href: "/owner/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "action-center", href: "/owner/action-center", label: "Action Center", icon: "zap", matchPrefix: "/owner/action-center" },
  {
    id: "my-vehicles",
    href: "/owner/my-vehicles",
    label: "My Vehicles",
    icon: "car",
    matchPrefixes: VEHICLE_HUB_PREFIXES,
  },
  { id: "bookings", href: "/owner/bookings", label: "Bookings", icon: "calendar", matchPrefix: "/owner/bookings" },
  { id: "return-journey", href: "/owner/return-journeys", label: "Return Journey", icon: "route", matchPrefix: "/owner/return-journeys" },
  { id: "earnings", href: "/owner/earnings", label: "Earnings", icon: "banknote", matchPrefix: "/owner/earnings" },
  { id: "wallet", href: "/owner/wallet", label: "Wallet", icon: "wallet", matchPrefix: "/owner/wallet" },
  { id: "payments", href: "/owner/payments", label: "Payments", icon: "credit-card", matchPrefix: "/owner/payments" },
  { id: "reports", href: "/owner/reports", label: "Reports", icon: "bar-chart", matchPrefix: "/owner/reports" },
  { id: "reviews", href: "/owner/reviews", label: "Reviews", icon: "star", matchPrefix: "/owner/reviews" },
  { id: "kyc", href: "/owner/kyc", label: "KYC Documents", icon: "shield", matchPrefix: "/owner/kyc" },
  { id: "notifications", href: "/owner/notifications", label: "Notifications", icon: "bell", matchPrefix: "/owner/notifications" },
  { id: "support", href: "/owner/support", label: "Support", icon: "life-buoy", matchPrefix: "/owner/support" },
];
