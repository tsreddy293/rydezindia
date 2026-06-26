import type { User } from "@supabase/supabase-js";
import {
  countActionablePendingPayments,
  filterActionableOwnerEarnings,
  isUnsettledOwnerEarning,
} from "@/lib/owner/booking-eligibility";
import type {
  OwnerActionItem,
  OwnerDashboardBooking,
  OwnerDashboardData,
  OwnerDashboardVehicle,
  OwnerDocumentReminder,
  OwnerNotificationPreview,
} from "@/lib/owner/dashboard-types";
import type { UserBooking } from "@/types/database";
import {
  getOwnerBookings,
  getOwnerDashboardMetrics,
  getOwnerEarnings,
  getOwnerStats,
} from "@/lib/supabase/queries";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { vehicleDisplayName } from "@/lib/vehicles/format";
import { listNotifications } from "@/lib/services/notifications";

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

function mapBooking(b: UserBooking): OwnerDashboardBooking {
  return {
    id: b.id,
    bookingReference: b.booking_reference ?? b.id.slice(0, 8),
    passengerName: b.passenger_name,
    bookingType: b.booking_type,
    amount: b.amount,
    bookingStatus: b.booking_status,
    paymentStatus: b.payment_status,
    pickupLocation: b.pickup_location,
    dropLocation: b.drop_location,
    pickupDate: b.pickup_date,
    createdAt: b.created_at,
  };
}

function mapVehicle(v: Awaited<ReturnType<typeof getOwnerVehiclesList>>[number]): OwnerDashboardVehicle {
  return {
    id: v.id,
    name: vehicleDisplayName(v),
    registrationNumber: v.registration_number,
    category: v.vehicle_category,
    status: v.approval_status,
    city: v.city ?? undefined,
    dailyFare: v.daily_fare,
    imageUrl: v.vehicle_photo_url,
    isActive: v.is_active,
    hasRc: Boolean(v.rc_document_url),
    hasInsurance: Boolean(v.insurance_document_url),
  };
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export async function getOwnerDashboardData(user: User): Promise<OwnerDashboardData> {
  const ownerId = user.id;
  const displayName =
    String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").trim() || "Owner";
  const memberSince = user.created_at ?? new Date().toISOString();

  const [metrics, stats, kyc, vehicles, bookingsRaw, earningsRaw, notifications] = await Promise.all([
    getOwnerDashboardMetrics(ownerId),
    getOwnerStats(ownerId),
    getOwnerKycStatus(),
    getOwnerVehiclesList(ownerId),
    getOwnerBookings(ownerId),
    getOwnerEarnings(ownerId),
    listNotifications({ recipientId: ownerId, recipientRole: "owner", limit: 20 }),
  ]);

  const bookings = bookingsRaw.map(mapBooking);
  const vehiclesMapped = vehicles.map(mapVehicle);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  const todaysBookings = bookings.filter((b) => new Date(b.createdAt) >= today).length;
  const monthlyBookings = bookings.filter((b) => new Date(b.createdAt) >= monthStart).length;
  const completedTrips = bookings.filter((b) => b.bookingStatus.toLowerCase() === "completed").length;
  const cancelledTrips = bookings.filter((b) => b.bookingStatus.toLowerCase() === "cancelled").length;
  const pendingPayments = countActionablePendingPayments(bookings, earningsRaw);
  const approvedVehicles = vehiclesMapped.filter((v) => v.status === "approved");
  const availableVehicles = approvedVehicles.filter((v) => v.isActive !== false).length;
  const disabledVehicles = vehiclesMapped.filter((v) => v.isActive === false).length;

  const earningsRows = earningsRaw as Array<Record<string, unknown>>;
  const actionableEarnings = filterActionableOwnerEarnings(earningsRows, bookings);
  const sumEarnings = (rows: typeof earningsRows) =>
    rows.reduce((sum, r) => sum + Number(r.net_amount ?? 0), 0);

  const lifetimeEarnings = sumEarnings(actionableEarnings);
  const weekEarnings = sumEarnings(
    actionableEarnings.filter((r) => new Date(String(r.earned_at ?? r.created_at)) >= weekStart)
  );
  const pendingSettlement = sumEarnings(
    actionableEarnings.filter((r) => isUnsettledOwnerEarning(r))
  );

  const earningsToday = sumEarnings(
    actionableEarnings.filter((r) => new Date(String(r.earned_at ?? r.created_at)) >= today)
  );
  const earningsThisMonth = sumEarnings(
    actionableEarnings.filter((r) => new Date(String(r.earned_at ?? r.created_at)) >= monthStart)
  );

  const walletBalance = lifetimeEarnings - pendingSettlement;
  const vehicleUtilization =
    metrics.totalVehicles > 0
      ? Math.round((metrics.activeBookings / metrics.totalVehicles) * 100)
      : 0;

  const kycPending = kyc.kycStatus !== "approved" || kyc.ownerStatus !== "approved";
  const vehiclePending = metrics.pendingVehicles;
  const newBookings = bookings.filter((b) => b.bookingStatus.toLowerCase() === "pending").length;
  const unreadNotificationCount = notifications.filter((n) => !n.read_at).length;

  const missingRc = vehicles.filter((v) => !v.rc_document_url).length;
  const missingInsurance = vehicles.filter((v) => !v.insurance_document_url).length;
  const pickupToday = bookings.filter((b) => isToday(b.pickupDate)).length;
  const disabledCount = disabledVehicles;

  const allActions: OwnerActionItem[] = [
    {
      id: "vehicle-pending",
      label: "Vehicle Pending Approval",
      description: `${vehiclePending} vehicle(s) awaiting admin review`,
      count: vehiclePending,
      href: "/owner/my-vehicles",
      priority: vehiclePending >= 2 ? "urgent" : "high",
      actionLabel: "View Fleet",
      icon: "car",
    },
    {
      id: "insurance-missing",
      label: "Insurance Document Missing",
      description: "Upload insurance to keep vehicles active",
      count: missingInsurance,
      href: "/owner/my-vehicles",
      priority: "high",
      actionLabel: "Upload",
      icon: "file-warning",
    },
    {
      id: "rc-missing",
      label: "RC Document Missing",
      description: "Registration certificate required for verification",
      count: missingRc,
      href: "/owner/my-vehicles",
      priority: "high",
      actionLabel: "Upload",
      icon: "file-text",
    },
    {
      id: "kyc-pending",
      label: "KYC Pending",
      description: kyc.kycStatus === "rejected" ? "KYC rejected — re-upload documents" : "Complete owner verification",
      count: kycPending ? 1 : 0,
      href: "/owner/kyc",
      priority: kyc.kycStatus === "rejected" ? "urgent" : "medium",
      actionLabel: "Complete KYC",
      icon: "shield",
    },
    {
      id: "new-booking",
      label: "New Booking Waiting",
      description: "Respond to pending booking requests",
      count: newBookings,
      href: "/owner/bookings",
      priority: "medium",
      actionLabel: "View Booking",
      icon: "calendar",
    },
    {
      id: "payment-pending",
      label: "Payment Pending",
      description: "Customer payment or owner settlement needs attention",
      count: pendingPayments,
      href: "/owner/bookings?filter=payment_pending",
      priority: "medium",
      actionLabel: "Review",
      icon: "credit-card",
    },
    {
      id: "pickup-today",
      label: "Pickup Today",
      description: "Trips scheduled for pickup today",
      count: pickupToday || metrics.upcomingTrips,
      href: "/owner/bookings",
      priority: "low",
      actionLabel: "View Schedule",
      icon: "truck",
    },
    {
      id: "vehicle-disabled",
      label: "Vehicle Disabled",
      description: "Re-enable vehicles to accept bookings",
      count: disabledCount,
      href: "/owner/my-vehicles",
      priority: disabledCount > 0 ? "urgent" : "medium",
      actionLabel: "Manage",
      icon: "alert-circle",
    },
    {
      id: "notifications",
      label: "Unread Messages",
      description: "New alerts and platform updates",
      count: unreadNotificationCount,
      href: "/owner/notifications",
      priority: "info",
      actionLabel: "Open Inbox",
      icon: "bell",
    },
  ];

  const actionCenter = allActions.filter((a) => a.count > 0);

  const documentReminders: OwnerDocumentReminder[] = [];
  if (missingInsurance > 0) {
    documentReminders.push({
      id: "insurance",
      label: "Insurance Document",
      description: `${missingInsurance} vehicle(s) need insurance upload`,
      href: "/owner/my-vehicles",
      priority: "high",
    });
  }
  if (missingRc > 0) {
    documentReminders.push({
      id: "rc",
      label: "RC Certificate",
      description: `${missingRc} vehicle(s) missing registration certificate`,
      href: "/owner/my-vehicles",
      priority: "high",
    });
  }
  if (kycPending) {
    documentReminders.push({
      id: "kyc",
      label: "Owner KYC Pending",
      description: "Complete identity verification to list vehicles",
      href: "/owner/kyc",
      priority: kyc.kycStatus === "rejected" ? "urgent" : "medium",
    });
  }
  if (vehiclePending > 0) {
    documentReminders.push({
      id: "vehicle-verify",
      label: "Vehicle Verification Pending",
      description: `${vehiclePending} vehicle(s) awaiting admin approval`,
      href: "/owner/my-vehicles",
      priority: "medium",
    });
  }

  const upcomingBookings = bookings
    .filter((b) => ["pending", "confirmed", "active"].includes(b.bookingStatus.toLowerCase()))
    .slice(0, 10);

  const vehicleBookingCounts = new Map<string, number>();
  for (const b of bookings) {
    const key = b.bookingType;
    vehicleBookingCounts.set(key, (vehicleBookingCounts.get(key) ?? 0) + 1);
  }
  const topVehicleEntry = [...vehicleBookingCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const cancellationRate =
    bookings.length > 0 ? Math.round((cancelledTrips / bookings.length) * 100) : 0;
  const acceptanceRate =
    bookings.length > 0
      ? Math.round((completedTrips / Math.max(bookings.length - cancelledTrips, 1)) * 100)
      : 100;
  const responseRate = Math.min(
    100,
    Math.round(((bookings.length - newBookings) / Math.max(bookings.length, 1)) * 100) || 95
  );

  const performanceScore = Math.min(
    100,
    Math.round(
      (approvedVehicles.length / Math.max(vehicles.length, 1)) * 35 +
        (completedTrips / Math.max(bookings.length, 1)) * 35 +
        (kyc.canAddVehicle ? 15 : 0) +
        (100 - cancellationRate) * 0.15
    )
  );

  const averageRating = 4.8;
  const reviewCount = 0;
  const revenueGoalTarget = 100000;
  const revenueGoalCurrent = stats.monthlyRevenue ?? earningsThisMonth;

  const notificationPreviews: OwnerNotificationPreview[] = notifications.map((n) => ({
    id: String(n.id),
    title: String(n.title ?? "Notification"),
    message: String(n.message ?? ""),
    read: Boolean(n.read_at),
    href: notificationHref(String(n.type ?? "")),
    createdAt: String(n.created_at ?? ""),
  }));

  const activity = [
    ...notifications.slice(0, 8).map((n) => ({
      id: String(n.id),
      date: String(n.created_at ?? ""),
      action: String(n.title ?? "Notification"),
    })),
    ...bookings.slice(0, 5).map((b) => ({
      id: `booking-${b.id}`,
      date: b.createdAt,
      action: `Booking ${b.bookingReference} — ${b.bookingStatus}`,
    })),
  ].slice(0, 12);

  const verificationLabel =
    kyc.status === "verified" && kyc.ownerStatus === "approved"
      ? "Verified Owner"
      : kyc.status === "verified"
        ? "KYC Verified"
        : "Verification Pending";

  return {
    displayName,
    kycStatus: kyc.status,
    ownerStatus: kyc.ownerStatus,
    verificationLabel,
    walletBalance,
    memberSince,
    averageRating,
    reviewCount,
    stats: {
      totalVehicles: metrics.totalVehicles,
      activeVehicles: metrics.approvedVehicles,
      pendingApproval: metrics.pendingVehicles,
      bookedVehicles: metrics.activeBookings,
      availableVehicles,
      todaysBookings,
      monthlyBookings,
      upcomingTrips: metrics.upcomingTrips,
      completedTrips,
      cancelledTrips,
      totalEarnings: lifetimeEarnings,
      pendingPayments,
      averageRating,
      reviewCount,
      earningsToday,
      earningsThisMonth,
      activeBookings: metrics.activeBookings,
      vehicleUtilization,
      walletBalance,
      pendingSettlement,
    },
    actionCenter,
    documentReminders,
    vehicles: vehiclesMapped,
    recentBookings: bookings.slice(0, 10),
    upcomingBookings,
    earnings: {
      today: earningsToday,
      week: weekEarnings,
      month: earningsThisMonth,
      lifetime: lifetimeEarnings,
      pendingSettlement,
    },
    reports: {
      revenueTrend: stats.revenueTrend ?? [],
      bookingTrend: stats.bookingTrend ?? [],
      topVehicle: topVehicleEntry
        ? { name: topVehicleEntry[0], bookings: topVehicleEntry[1] }
        : null,
      cancellationRate,
      utilizationPercent: vehicleUtilization,
    },
    performance: {
      responseRate,
      acceptanceRate,
      cancellationRate,
      averageRating,
      completedTrips,
      totalReviews: reviewCount,
      performanceScore,
    },
    revenueGoal: { current: revenueGoalCurrent, target: revenueGoalTarget },
    activity,
    notifications: notificationPreviews,
    unreadNotificationCount,
  };
}
