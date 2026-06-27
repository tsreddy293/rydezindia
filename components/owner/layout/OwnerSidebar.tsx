"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Banknote,
  BarChart3,
  Bell,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Route,
  Shield,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { isOwnerNavItemActive } from "@/lib/owner/owner-nav-active";
import { OWNER_SIDEBAR_NAV, type OwnerNavIcon } from "@/lib/owner/owner-nav";
import { cn } from "@/lib/utils";
import { signOutUser } from "@/server/actions/auth";

const ICON_MAP: Record<OwnerNavIcon, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  zap: Zap,
  car: Car,
  calendar: Calendar,
  route: Route,
  banknote: Banknote,
  wallet: Wallet,
  "credit-card": CreditCard,
  "bar-chart": BarChart3,
  star: Star,
  shield: Shield,
  bell: Bell,
  "life-buoy": LifeBuoy,
  "log-out": LogOut,
};

export default function OwnerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);

  const activeId = OWNER_SIDEBAR_NAV.find((item) =>
    isOwnerNavItemActive(pathname, searchParams, item)
  )?.id;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-gray-200/80 bg-white dark:border-gray-800 dark:bg-gray-900",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
        {!collapsed && (
          <div>
            <p className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-sm font-bold text-transparent">
              Rydez India
            </p>
            <p className="text-[10px] tracking-wider text-gray-400">Owner Portal</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:inline-flex dark:hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {OWNER_SIDEBAR_NAV.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const active = item.id === activeId;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-gradient-to-r from-secondary to-primary text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
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
      <div className="border-t border-gray-100 p-3 dark:border-gray-800">
        <form action={signOutUser}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
