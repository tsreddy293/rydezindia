import { requireRole } from "@/server/actions/auth";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
import { getOwnerDashboardMetrics, getOwnerEarnings } from "@/lib/supabase/queries";
import { listNotifications } from "@/lib/services/notifications";
import OwnerShell from "@/components/owner/layout/OwnerShell";
import type { OwnerNotificationItem } from "@/components/owner/layout/OwnerNotificationBell";

function notificationHref(type: string): string {
  const map: Record<string, string> = {
    new_booking: "/owner/bookings",
    booking_cancelled: "/owner/bookings",
    vehicle_approved: "/owner/my-vehicles",
    vehicle_pending_approval: "/owner/my-vehicles",
    payment_received: "/owner/earnings",
    document_expiry: "/owner/kyc",
  };
  return map[type] ?? "/owner/notifications";
}

export default async function OwnerLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole("owner");
  const displayName =
    String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").trim() || "Owner";

  const [kyc, metrics, earningsRaw, notificationsRaw] = await Promise.all([
    getOwnerKycStatus(),
    getOwnerDashboardMetrics(user.id),
    getOwnerEarnings(user.id),
    listNotifications({ recipientId: user.id, recipientRole: "owner", limit: 20 }),
  ]);

  const lifetime = (earningsRaw as Array<Record<string, unknown>>).reduce(
    (sum, r) => sum + Number(r.net_amount ?? 0),
    0
  );
  const pending = (earningsRaw as Array<Record<string, unknown>>)
    .filter((r) => String(r.status ?? "").toLowerCase() !== "settled")
    .reduce((sum, r) => sum + Number(r.net_amount ?? 0), 0);
  const walletBalance = lifetime - pending;

  const verificationLabel =
    kyc.status === "verified" && kyc.ownerStatus === "approved"
      ? "Verified Owner"
      : kyc.status === "verified"
        ? "KYC Verified"
        : "Pending";

  const notifications: OwnerNotificationItem[] = notificationsRaw.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? "Notification"),
    message: String(n.message ?? ""),
    read_at: n.read_at as string | null | undefined,
    href: notificationHref(String(n.type ?? "")),
  }));

  return (
    <OwnerShell
      displayName={displayName}
      verificationLabel={verificationLabel}
      walletBalance={walletBalance}
      averageRating={4.8}
      memberSince={user.created_at ?? new Date().toISOString()}
      notifications={notifications}
    >
      {children}
    </OwnerShell>
  );
}
