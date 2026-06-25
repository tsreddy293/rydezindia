import { listNotifications } from "@/lib/services/notifications";
import AdminShell from "@/components/admin/layout/AdminShell";
import type { AdminNotificationItem } from "@/components/admin/layout/AdminNotificationBell";

function notificationHref(type: string): string {
  const map: Record<string, string> = {
    new_booking: "/admin/bookings",
    booking_cancelled: "/admin/refunds",
    vehicle_pending_approval: "/admin/vehicles",
    vehicle_approved: "/admin/vehicles",
    owner_approved: "/admin/owner-management",
    refund_processed: "/admin/refunds",
    payment_received: "/admin/payments",
  };
  return map[type] ?? "/admin/notifications";
}

export default async function AdminLayoutWrapper({
  children,
  pageTitle,
}: {
  children: React.ReactNode;
  pageTitle?: string;
}) {
  const raw = await listNotifications({ recipientRole: "admin", limit: 25 });
  const notifications: AdminNotificationItem[] = raw.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? "Notification"),
    message: String(n.message ?? ""),
    type: String(n.type ?? ""),
    read_at: n.read_at as string | null | undefined,
    created_at: String(n.created_at ?? ""),
    href: notificationHref(String(n.type ?? "")),
  }));

  return (
    <AdminShell notifications={notifications} pageTitle={pageTitle}>
      {children}
    </AdminShell>
  );
}
