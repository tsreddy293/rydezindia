import Link from "next/link";
import { Bell } from "lucide-react";
import type { OwnerNotificationPreview } from "@/lib/owner/dashboard-types";
import { formatDate } from "@/lib/utils";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

export default function OwnerNotificationsPreview({
  notifications,
  unreadCount,
}: {
  notifications: OwnerNotificationPreview[];
  unreadCount: number;
}) {
  return (
    <OwnerSection
      title="Notification Center"
      description={`${unreadCount} unread notification(s)`}
      action={
        <Link href="/owner/notifications" className="text-sm font-semibold text-primary hover:underline">
          View all →
        </Link>
      }
    >
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {notifications.slice(0, 6).map((n) => (
            <li key={n.id}>
              <Link
                href={n.href}
                className={`flex items-start gap-3 px-5 py-4 transition hover:bg-gray-50 ${!n.read ? "bg-primary/5" : ""}`}
              >
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <div className={!n.read ? "" : "pl-5"}>
                  <p className="font-medium text-secondary">{n.title}</p>
                  {n.message && <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{n.message}</p>}
                  <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </OwnerSection>
  );
}
