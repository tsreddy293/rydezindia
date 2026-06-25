"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RIDER_BOOKINGS_PATH } from "@/lib/auth/rbac-paths";

const USER_LINKS = [
  { href: "/dashboard", label: "Overview", aliases: ["/user/dashboard"] },
  { href: "/dashboard/kyc", label: "KYC Documents", kycOnly: true, aliases: ["/user/profile/kyc"] },
  { href: "/dashboard/verification", label: "Verification", kycOnly: true, aliases: ["/user/dashboard/verification"] },
  { href: RIDER_BOOKINGS_PATH, label: "My Bookings", aliases: ["/user/bookings"] },
  { href: "/dashboard/wallet", label: "Wallet", aliases: ["/user/wallet"] },
  { href: "/dashboard/referrals", label: "Referrals", aliases: ["/user/referrals"] },
  { href: "/user/profile/safety", label: "Safety" },
  { href: "/dashboard/saved", label: "Saved", aliases: ["/user/saved"] },
  { href: "/dashboard/profile", label: "Profile", aliases: ["/user/profile"] },
];

interface Props {
  showKycLinks?: boolean;
}

function matchesLink(pathname: string, href: string, aliases: string[] = []) {
  return pathname === href || aliases.includes(pathname);
}

export default function UserDashboardNav({ showKycLinks = false }: Props) {
  const pathname = usePathname();
  const onKycRoute = USER_LINKS.some(
    (link) => link.kycOnly && matchesLink(pathname, link.href, link.aliases)
  );

  const visibleLinks = USER_LINKS.filter((link) => {
    if (link.kycOnly) return showKycLinks || onKycRoute;
    return true;
  });

  return (
    <nav className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {visibleLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
            matchesLink(pathname, link.href, link.aliases)
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
