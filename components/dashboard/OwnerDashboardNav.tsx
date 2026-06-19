"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OWNER_LINKS = [
  { href: "/owner/dashboard", label: "Dashboard" },
  { href: "/owner/my-vehicles", label: "My Vehicles" },
  { href: "/owner/bookings", label: "My Bookings" },
  { href: "/owner/earnings", label: "Earnings" },
  { href: "/owner/kyc", label: "KYC Verification" },
  { href: "/owner/profile", label: "Profile" },
  { href: "/return-journeys", label: "Return Journeys" },
];

export default function OwnerDashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {OWNER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            pathname === link.href || pathname.startsWith(`${link.href}/`)
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
