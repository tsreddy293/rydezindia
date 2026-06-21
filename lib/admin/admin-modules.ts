/** Canonical admin navigation — single source for dashboard and shell links. */
export const ADMIN_MODULES = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/owner-management", label: "Owner Management" },
  { href: "/admin/customer-management", label: "Customer Management" },
  { href: "/admin/vehicles", label: "Vehicle Management" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/coupons", label: "Coupons" },
] as const;

export const LEGACY_ADMIN_REDIRECTS: Record<string, string> = {
  "/admin/owners": "/admin/owner-management",
  "/admin/kyc": "/admin/owner-management",
  "/admin/users": "/admin/customer-management",
  "/admin/customer-kyc": "/admin/customer-management",
  "/admin/documents": "/admin/vehicles",
};
