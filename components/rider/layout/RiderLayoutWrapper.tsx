import { listNotifications } from "@/lib/services/notifications";
import { shouldShowRiderKyc } from "@/lib/services/customer-profile";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { getRiderWelcomeProfile } from "@/lib/users/rider-profile";
import { requireRiderDashboard } from "@/lib/auth/customer-auth";
import RiderShell from "@/components/rider/layout/RiderShell";
import type { RiderNotificationItem } from "@/components/rider/layout/RiderNotificationBell";

function notificationHref(type: string): string {
  const map: Record<string, string> = {
    new_booking: "/dashboard/bookings",
    booking_confirmed: "/dashboard/bookings",
    booking_cancelled: "/dashboard/bookings",
    refund_processed: "/dashboard/bookings",
    payment_received: "/dashboard/wallet",
    vehicle_approved: "/dashboard/saved",
  };
  return map[type] ?? "/dashboard/bookings";
}

export default async function RiderLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user } = await requireRiderDashboard();
  const [notificationsRaw, kyc, showKycLinks] = await Promise.all([
    listNotifications({ recipientId: user.id, recipientRole: "rider", limit: 20 }),
    getCustomerKycStatus(),
    shouldShowRiderKyc(user.id),
  ]);

  const welcome = await getRiderWelcomeProfile(user, {
    kycStatus: kyc.status,
    showKycSection: showKycLinks,
  });

  const notifications: RiderNotificationItem[] = notificationsRaw.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? "Notification"),
    message: String(n.message ?? ""),
    read_at: n.read_at as string | null | undefined,
    href: notificationHref(String(n.type ?? "")),
  }));

  return (
    <RiderShell
      notifications={notifications}
      firstName={welcome.firstName}
      showKycLinks={showKycLinks}
    >
      {children}
    </RiderShell>
  );
}
