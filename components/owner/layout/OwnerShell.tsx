"use client";

import { Suspense, useState } from "react";
import { Menu, X } from "lucide-react";
import OwnerSidebar from "@/components/owner/layout/OwnerSidebar";
import OwnerHeader from "@/components/owner/layout/OwnerHeader";
import OwnerRouteNormalizer from "@/components/owner/layout/OwnerRouteNormalizer";
import type { OwnerNotificationItem } from "@/components/owner/layout/OwnerNotificationBell";

export default function OwnerShell({
  children,
  displayName,
  verificationLabel,
  walletBalance,
  averageRating,
  memberSince,
  notifications,
}: {
  children: React.ReactNode;
  displayName: string;
  verificationLabel: string;
  walletBalance: number;
  averageRating: number;
  memberSince: string;
  notifications: OwnerNotificationItem[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-gray-950">
      <OwnerRouteNormalizer />
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}
      <div
        className={`fixed left-0 top-0 z-50 h-screen transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Suspense fallback={<div className="h-screen w-64 border-r bg-white dark:bg-gray-900" />}>
          <OwnerSidebar onNavigate={() => setMobileOpen(false)} />
        </Suspense>
      </div>
      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3 lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="font-bold text-secondary dark:text-white">Rydez India</p>
        </div>
        <OwnerHeader
          displayName={displayName}
          verificationLabel={verificationLabel}
          walletBalance={walletBalance}
          averageRating={averageRating}
          memberSince={memberSince}
          notifications={notifications}
        />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
