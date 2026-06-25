"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  RotateCcw,
  Settings,
  Shield,
  Ticket,
  UserCircle,
  Users,
} from "lucide-react";
import { useState } from "react";
import { ADMIN_SIDEBAR_NAV, type AdminNavIcon } from "@/lib/admin/admin-modules";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<AdminNavIcon, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "alert-circle": AlertCircle,
  calendar: Calendar,
  car: Car,
  users: Users,
  "user-circle": UserCircle,
  "credit-card": CreditCard,
  "rotate-ccw": RotateCcw,
  shield: Shield,
  ticket: Ticket,
  bell: Bell,
  "bar-chart": BarChart3,
  settings: Settings,
};

export default function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string, matchPrefix?: string) {
    if (href.includes("#")) {
      return pathname === "/admin";
    }
    if (matchPrefix) return pathname.startsWith(matchPrefix);
    return pathname === href;
  }

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-sm",
        collapsed ? "lg:w-[72px]" : "lg:w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-secondary">Rydez India</p>
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Admin Panel</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {ADMIN_SIDEBAR_NAV.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const active = isActive(item.href, item.matchPrefix);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-white shadow-sm"
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

      {!collapsed && (
        <div className="border-t border-gray-100 p-4 text-xs text-gray-400">
          Marketplace Administration
        </div>
      )}
    </aside>
  );
}
