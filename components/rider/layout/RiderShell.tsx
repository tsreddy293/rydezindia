"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import RiderSidebar from "@/components/rider/layout/RiderSidebar";
import RiderHeader from "@/components/rider/layout/RiderHeader";
import type { RiderNotificationItem } from "@/components/rider/layout/RiderNotificationBell";

export default function RiderShell({
  children,
  notifications,
  firstName,
  showKycLinks,
}: {
  children: React.ReactNode;
  notifications: RiderNotificationItem[];
  firstName: string;
  showKycLinks: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 h-screen transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <RiderSidebar showKycLinks={showKycLinks} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-xl p-2 text-gray-600 hover:bg-gray-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="font-bold text-secondary">Rydez</p>
        </div>

        <RiderHeader notifications={notifications} firstName={firstName} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
