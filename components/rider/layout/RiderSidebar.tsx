"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { RIDER_SIDEBAR_NAV, type RiderNavIcon } from "@/lib/rider/rider-nav";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<RiderNavIcon, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  calendar: Calendar,
  wallet: Wallet,
  heart: Heart,
  gift: Gift,
  shield: Shield,
  "badge-check": BadgeCheck,
  user: User,
  "life-buoy": LifeBuoy,
  bell: LifeBuoy,
};

function matchesPath(pathname: string, href: string, aliases: string[] = []) {
  return pathname === href || aliases.includes(pathname);
}

export default function RiderSidebar({
  showKycLinks,
  onNavigate,
}: {
  showKycLinks: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const onKycRoute = RIDER_SIDEBAR_NAV.some(
    (item) => item.kycOnly && matchesPath(pathname, item.href, item.aliases)
  );

  const visibleNav = RIDER_SIDEBAR_NAV.filter((item) => {
    if (item.kycOnly) return showKycLinks || onKycRoute;
    return true;
  });

  function isActive(item: (typeof RIDER_SIDEBAR_NAV)[number]) {
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return matchesPath(pathname, item.href, item.aliases);
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200/80 bg-white",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        {!collapsed && (
          <div>
            <p className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-sm font-bold text-transparent">
              Rydez India
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Rider Hub</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20"
                      : "text-gray-600 hover:bg-gray-50 hover:text-secondary"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
