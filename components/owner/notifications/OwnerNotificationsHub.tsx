"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OwnerPageToolbar from "@/components/owner/shared/OwnerPageToolbar";
import OwnerTabs from "@/components/owner/shared/OwnerTabs";
import { markAllOwnerNotificationsRead, markOwnerNotificationRead } from "@/server/actions/ownerNotifications";
import { useOwnerToast } from "@/components/owner/shared/useOwnerToast";
import { formatDate } from "@/lib/utils";

export interface OwnerNotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  href: string;
}

type FilterTab = "all" | "unread";

const TYPE_ICONS: Record<string, string> = {
  vehicle_approved: "✅",
  vehicle_rejected: "❌",
  new_booking: "📅",
  booking_cancelled: "🚫",
  payment_received: "💰",
  document_expiry: "⚠️",
};

interface Props {
  notifications: OwnerNotificationRow[];
}

export default function OwnerNotificationsHub({ notifications }: Props) {
  const router = useRouter();
  const { show, Toast } = useOwnerToast();
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  const filtered = useMemo(() => {
    let list = notifications;
    if (tab === "unread") list = list.filter((n) => !n.read);
    const q = search.toLowerCase();
    if (q) list = list.filter((n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    return list;
  }, [notifications, tab, search]);

  function markRead(id: string) {
    startTransition(async () => {
      await markOwnerNotificationRead(id);
      router.refresh();
    });
  }

  function markAllRead() {
    startTransition(async () => {
      await markAllOwnerNotificationsRead(unreadIds);
      show("All notifications marked read", "success");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {Toast}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <OwnerTabs
          tabs={[
            { id: "all" as const, label: "All" },
            { id: "unread" as const, label: "Unread" },
          ]}
          active={tab}
          onChange={setTab}
          counts={{ all: notifications.length, unread: unreadIds.length }}
        />
        {unreadIds.length > 0 && (
          <button type="button" onClick={markAllRead} disabled={pending} className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white">
            Mark All Read
          </button>
        )}
      </div>

      <OwnerPageToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search notifications…" onRefresh={() => router.refresh()} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-gray-500">No notifications</div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-white shadow-sm">
          {filtered.map((n) => (
            <li key={n.id} className={`flex gap-4 px-5 py-4 ${!n.read ? "bg-primary/5" : ""}`}>
              <span className="text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-secondary">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                <div className="mt-2 flex gap-3">
                  <Link href={n.href} className="text-xs font-semibold text-primary hover:underline">Open</Link>
                  {!n.read && (
                    <button type="button" onClick={() => markRead(n.id)} className="text-xs font-semibold text-gray-500 hover:text-secondary">
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
