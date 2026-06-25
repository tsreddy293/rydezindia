/** Canonical admin navigation — sidebar and dashboard links. */

export type AdminNavIcon =
  | "layout-dashboard"
  | "alert-circle"
  | "calendar"
  | "car"
  | "users"
  | "user-circle"
  | "credit-card"
  | "rotate-ccw"
  | "shield"
  | "ticket"
  | "bell"
  | "bar-chart"
  | "settings";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: AdminNavIcon;
  /** Highlight when pathname starts with this (for nested routes). */
  matchPrefix?: string;
}

export const ADMIN_SIDEBAR_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/admin#action-center", label: "Action Center", icon: "alert-circle" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar", matchPrefix: "/admin/bookings" },
  { href: "/admin/vehicles", label: "Vehicles", icon: "car", matchPrefix: "/admin/vehicles" },
  { href: "/admin/owner-management", label: "Owners", icon: "users", matchPrefix: "/admin/owner-management" },
  { href: "/admin/customer-management", label: "Customers", icon: "user-circle", matchPrefix: "/admin/customer-management" },
  { href: "/admin/payments", label: "Payments", icon: "credit-card", matchPrefix: "/admin/payments" },
  { href: "/admin/refunds", label: "Refunds", icon: "rotate-ccw", matchPrefix: "/admin/refunds" },
  { href: "/admin/protection", label: "Protection Plans", icon: "shield", matchPrefix: "/admin/protection" },
  { href: "/admin/coupons", label: "Coupons", icon: "ticket", matchPrefix: "/admin/coupons" },
  { href: "/admin/notifications", label: "Notifications", icon: "bell", matchPrefix: "/admin/notifications" },
  { href: "/admin/reports", label: "Reports", icon: "bar-chart", matchPrefix: "/admin/reports" },
  { href: "/admin#settings", label: "Settings", icon: "settings" },
];

/** @deprecated Use ADMIN_SIDEBAR_NAV — kept for backward compatibility. */
export const ADMIN_MODULES = ADMIN_SIDEBAR_NAV.filter(
  (item) => !item.href.includes("#")
).map(({ href, label }) => ({ href, label }));

export const LEGACY_ADMIN_REDIRECTS: Record<string, string> = {
  "/admin/owners": "/admin/owner-management",
  "/admin/kyc": "/admin/owner-management",
  "/admin/users": "/admin/customer-management",
  "/admin/customer-kyc": "/admin/customer-management",
  "/admin/documents": "/admin/vehicles",
};

/** Platform commission rate for finance dashboard display. */
export const PLATFORM_COMMISSION_RATE = 0.15;
