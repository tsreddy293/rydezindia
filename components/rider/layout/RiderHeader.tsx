"use client";

import Link from "next/link";
import RiderGlobalSearch from "@/components/rider/layout/RiderGlobalSearch";
import RiderNotificationBell, {
  type RiderNotificationItem,
} from "@/components/rider/layout/RiderNotificationBell";
import { signOutUser } from "@/server/actions/auth";

export default function RiderHeader({
  notifications,
  displayName,
}: {
  notifications: RiderNotificationItem[];
  displayName: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <p className="text-sm font-semibold text-secondary lg:hidden">Hi, {displayName}</p>
        <RiderGlobalSearch />
        <div className="flex items-center gap-2">
          <RiderNotificationBell notifications={notifications} />
          <Link href="/search" className="hidden rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 sm:inline">
            Book Ride
          </Link>
          <form action={signOutUser}>
            <button
              type="submit"
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
