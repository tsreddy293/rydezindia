"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { markAdminNotificationRead } from "@/server/actions/adminNotifications";

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  read_at?: string | null;
  created_at?: string;
  href?: string;
}

export default function AdminNotificationBell({
  notifications,
}: {
  notifications: AdminNotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unread = notifications.filter((n) => !n.read_at);
  const unreadCount = unread.length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markAdminNotificationRead(id);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,380px)] rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="font-semibold text-secondary">Notifications</p>
            <span className="text-xs text-gray-400">{unreadCount} unread</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : (
              notifications.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-50 px-4 py-3 ${!n.read_at ? "bg-blue-50/40" : ""}`}
                >
                  <p className="text-sm font-medium text-secondary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!n.read_at && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleMarkRead(n.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Check className="h-3 w-3" />
                        Mark as Read
                      </button>
                    )}
                    <Link
                      href={n.href ?? "/admin/notifications"}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-100 p-3">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 py-2 text-sm font-medium text-secondary hover:bg-gray-100"
            >
              View All
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
