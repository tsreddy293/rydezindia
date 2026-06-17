"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const USER_LINKS = [
  { href: "/user/dashboard", label: "Overview" },
  { href: "/user/bookings", label: "My Bookings" },
  { href: "/user/trips/active", label: "Active Trips" },
  { href: "/user/trips/completed", label: "Completed Trips" },
  { href: "/user/saved", label: "Saved Vehicles" },
  { href: "/user/profile", label: "Profile" },
];

export default function UserDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {USER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            pathname === link.href
              ? "bg-primary text-white"
              : "bg-gray-50 text-secondary hover:bg-primary hover:text-white"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
