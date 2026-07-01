import { listNotifications } from "@/lib/services/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldShowRiderKyc } from "@/lib/services/customer-profile";
import {
  collectExcludedRiderBookingIds,
  filterRiderPaymentNotifications,
} from "@/lib/rider/dashboard-booking-eligibility";
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
  const [notificationsRaw, kyc, showKycLinks, bookingRows] = await Promise.all([
    listNotifications({ recipientId: user.id, recipientRole: "rider", limit: 20 }),
    getCustomerKycStatus(),
    shouldShowRiderKyc(user.id),
    createAdminClient()
      .from("bookings")
      .select("id, booking_status, payment_status, refund_status, cancelled_at")
      .eq("user_id", user.id),
  ]);

  const excludedBookingIds = collectExcludedRiderBookingIds(
    (bookingRows.data ?? []).map((row) => ({
      id: String(row.id),
      bookingStatus: String(row.booking_status ?? ""),
      paymentStatus: String(row.payment_status ?? ""),
      refundStatus: String(row.refund_status ?? ""),
      cancelledAt: row.cancelled_at as string | null,
    }))
  );

  const filteredNotifications = filterRiderPaymentNotifications(
    notificationsRaw,
    excludedBookingIds
  );

  const welcome = await getRiderWelcomeProfile(user, {
    kycStatus: kyc.status,
    showKycSection: showKycLinks,
  });

  const notifications: RiderNotificationItem[] = filteredNotifications.map((n) => ({
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
