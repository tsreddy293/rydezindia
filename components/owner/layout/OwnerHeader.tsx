"use client";

import { Star } from "lucide-react";
import OwnerGlobalSearch from "@/components/owner/layout/OwnerGlobalSearch";
import OwnerNotificationBell, { type OwnerNotificationItem } from "@/components/owner/layout/OwnerNotificationBell";
import OwnerThemeToggle from "@/components/owner/layout/OwnerThemeToggle";
import { formatINR } from "@/lib/utils";
import { signOutUser } from "@/server/actions/auth";

function formatMemberSince(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function OwnerHeader({
  displayName,
  verificationLabel,
  walletBalance,
  averageRating,
  memberSince,
  notifications,
}: {
  displayName: string;
  verificationLabel: string;
  walletBalance: number;
  averageRating: number;
  memberSince: string;
  notifications: OwnerNotificationItem[];
}) {
  const isVerified = verificationLabel.includes("Verified");

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-4 lg:px-6">
        <div className="hidden min-w-0 shrink-0 lg:block">
          <p className="truncate text-sm font-bold text-secondary dark:text-white">
            Welcome, <span className="text-primary">{displayName}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isVerified ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
              }`}
            >
              {verificationLabel}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400" />
              {averageRating.toFixed(1)}
            </span>
            <span className="text-[10px] text-gray-400">Member since {formatMemberSince(memberSince)}</span>
          </div>
        </div>
        <OwnerGlobalSearch />
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white px-3 py-2 text-right sm:block dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Wallet</p>
            <p className="text-sm font-bold text-secondary dark:text-white">{formatINR(walletBalance)}</p>
          </div>
          <OwnerThemeToggle />
          <OwnerNotificationBell notifications={notifications} />
          <form action={signOutUser}>
            <button
              type="submit"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
