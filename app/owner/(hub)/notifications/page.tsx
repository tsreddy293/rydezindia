import nextDynamic from "next/dynamic";
import { listNotifications } from "@/lib/services/notifications";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

const OwnerNotificationsHub = nextDynamic(() => import("@/components/owner/notifications/OwnerNotificationsHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Notifications",
  description: "Owner notifications on Rydez India.",
  path: "/owner/notifications",
  noIndex: true,
});

function notificationHref(type: string): string {
  const map: Record<string, string> = {
    new_booking: "/owner/bookings",
    booking_cancelled: "/owner/bookings",
    vehicle_approved: "/owner/my-vehicles",
    vehicle_rejected: "/owner/my-vehicles",
    payment_received: "/owner/earnings",
    document_expiry: "/owner/kyc",
  };
  return map[type] ?? "/owner/notifications";
}

export default async function OwnerNotificationsPage() {
  const { user } = await requireRole("owner");
  const notificationsRaw = await listNotifications({
    recipientId: user.id,
    recipientRole: "owner",
    limit: 100,
  });

  const notifications = notificationsRaw.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? "Notification"),
    message: String(n.message ?? ""),
    type: String(n.type ?? ""),
    read: Boolean(n.read_at),
    createdAt: String(n.created_at ?? ""),
    href: notificationHref(String(n.type ?? "")),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-gray-500">
          {notifications.filter((n) => !n.read).length} unread
        </p>
      </div>
      <OwnerNotificationsHub notifications={notifications} />
    </div>
  );
}
