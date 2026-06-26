"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { markOwnerNotificationRead } from "@/server/actions/ownerNotifications";

export interface OwnerNotificationItem {
  id: string;
  title: string;
  message: string;
  read_at?: string | null;
  href?: string;
}

export default function OwnerNotificationBell({
  notifications,
}: {
  notifications: OwnerNotificationItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read_at);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2 hover:bg-gray-100">
        <Bell className="h-5 w-5 text-gray-600" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] rounded-2xl border bg-white shadow-xl">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">Notifications</p>
            <p className="text-xs text-gray-400">{unread.length} unread</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div key={n.id} className={`border-b px-4 py-3 ${!n.read_at ? "bg-sky-50/50" : ""}`}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                  <div className="mt-2 flex gap-2">
                    {!n.read_at && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await markOwnerNotificationRead(n.id);
                            router.refresh();
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-medium"
                      >
                        <Check className="h-3 w-3" /> Mark Read
                      </button>
                    )}
                    <Link href={n.href ?? "/owner/notifications"} onClick={() => setOpen(false)} className="text-[10px] font-medium text-primary">
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3">
            <Link href="/owner/notifications" onClick={() => setOpen(false)} className="block rounded-xl bg-gray-50 py-2 text-center text-sm font-medium">
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
