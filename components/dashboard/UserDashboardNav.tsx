"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const USER_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/kyc", label: "KYC Documents" },
  { href: "/user/dashboard/verification", label: "Verification" },
  { href: "/user/bookings", label: "My Bookings" },
  { href: "/user/wallet", label: "Wallet" },
  { href: "/user/referrals", label: "Referrals" },
  { href: "/user/profile/safety", label: "Safety" },
  { href: "/user/saved", label: "Saved" },
  { href: "/user/profile", label: "Profile" },
];

export default function UserDashboardNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href === "/dashboard/kyc" && pathname === "/user/profile/kyc");

  return (
    <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {USER_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            isActive(link.href)
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
