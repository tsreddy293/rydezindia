"use client";

import Link from "next/link";
import AdminGlobalSearch from "@/components/admin/layout/AdminGlobalSearch";
import AdminNotificationBell, {
  type AdminNotificationItem,
} from "@/components/admin/layout/AdminNotificationBell";
import { signOutUser } from "@/server/actions/auth";

export default function AdminHeader({
  notifications,
  title,
}: {
  notifications: AdminNotificationItem[];
  title?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          {title && <h1 className="truncate text-lg font-bold text-secondary lg:hidden">{title}</h1>}
        </div>
        <div className="flex flex-1 items-center gap-3 sm:max-w-2xl">
          <AdminGlobalSearch />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <AdminNotificationBell notifications={notifications} />
          <Link
            href="/"
            className="hidden rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 sm:inline"
          >
            Site
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
