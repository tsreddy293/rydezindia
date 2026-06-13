import { AdminPageShell } from "@/components/admin/AdminTable";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { listNotifications } from "@/lib/services/notifications";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireRole("admin");
  const notifications = await listNotifications({ recipientRole: "admin", limit: 100 });

  return (
    <AdminPageShell title="Notifications" description="System and marketplace notifications">
      <NotificationCenter notifications={notifications as Record<string, unknown>[]} />
    </AdminPageShell>
  );
}
