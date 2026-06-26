"use client";

import Link from "next/link";
import RiderGlobalSearch from "@/components/rider/layout/RiderGlobalSearch";
import RiderNotificationBell, {
  type RiderNotificationItem,
} from "@/components/rider/layout/RiderNotificationBell";
import { signOutUser } from "@/server/actions/auth";

export default function RiderHeader({
  notifications,
  firstName,
}: {
  notifications: RiderNotificationItem[];
  firstName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-4 lg:px-6">
        <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
          <span className="text-base" aria-hidden>
            👤
          </span>
          <p className="truncate text-sm font-bold text-secondary">
            Hi, <span className="text-primary">{firstName}</span>
          </p>
        </div>

        <RiderGlobalSearch />

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 lg:hidden">
            <span className="text-base" aria-hidden>
              👤
            </span>
            <span className="text-sm font-semibold text-secondary">Hi, {firstName}</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <RiderNotificationBell notifications={notifications} showLabel />
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-secondary to-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
            >
              <span aria-hidden>🚗</span>
              <span>Book Ride</span>
            </Link>
            <form action={signOutUser}>
              <button
                type="submit"
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
