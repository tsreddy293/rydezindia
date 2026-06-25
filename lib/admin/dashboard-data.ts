import { PLATFORM_COMMISSION_RATE } from "@/lib/admin/admin-modules";
import type {
  ActionCenterItem,
  ActionPriority,
  ActivityItem,
  AdminDashboardData,
  DashboardBookingRow,
  PendingApprovalItem,
  ReminderItem,
} from "@/lib/admin/dashboard-types";
import {
  deriveProtectionFields,
  selectBookingsList,
  BOOKING_ADMIN_LIST_COLUMN_SETS,
} from "@/lib/bookings/booking-select";
import { getProtectionAnalytics } from "@/lib/services/protection-analytics";
import { getRefundAnalytics } from "@/lib/services/booking-cancellation";
import { listNotifications } from "@/lib/services/notifications";
import { getAnalyticsReport } from "@/lib/services/analytics";
import {
  getAdminCustomerManagementList,
  getAdminOwnerManagementList,
  getAdminVehicleList,
  getPlatformStats,
} from "@/lib/supabase/queries";

export type {
  ActionCenterItem,
  ActionPriority,
  ActivityItem,
  AdminDashboardData,
  DashboardBookingRow,
  PendingApprovalItem,
  ReminderItem,
} from "@/lib/admin/dashboard-types";

function priorityFromCount(count: number, urgentThreshold = 5, highThreshold = 1): ActionPriority {
  if (count === 0) return "completed";
  if (count >= urgentThreshold) return "urgent";
  if (count >= highThreshold) return "high";
  return "medium";
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatActivityDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function notificationActionLabel(type: string): string {
  const map: Record<string, string> = {
    new_booking: "Booking Created",
    booking_confirmed: "Booking Confirmed",
    booking_cancelled: "Booking Cancelled",
    vehicle_approved: "Vehicle Approved",
    vehicle_pending_approval: "Vehicle Uploaded",
    vehicle_rejected: "Vehicle Rejected",
    owner_approved: "Owner Verified",
    payment_received: "Payment Received",
    refund_processed: "Refund Processed",
  };
  return map[type] ?? "Activity";
}

const BOOKING_DASHBOARD_COLUMNS = [
  ...BOOKING_ADMIN_LIST_COLUMN_SETS,
  "id, booking_reference, booking_type, passenger_name, mobile, amount, booking_status, payment_status, refund_status, cancellation_status, owner_id, vehicle_id, created_at",
] as const;

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    stats,
    analytics,
    protection,
    refunds,
    notifications,
    owners,
    customers,
    vehicles,
    bookingRows,
  ] = await Promise.all([
    getPlatformStats(),
    getAnalyticsReport(),
    getProtectionAnalytics(),
    getRefundAnalytics(),
    listNotifications({ recipientRole: "admin", limit: 30 }),
    getAdminOwnerManagementList(),
    getAdminCustomerManagementList(),
    getAdminVehicleList(200),
    selectBookingsList(BOOKING_DASHBOARD_COLUMNS, 100),
  ]);

  const cancellationRequests = bookingRows.filter((b) => {
    const status = String(b.booking_status ?? "").toLowerCase();
    const refund = String(b.refund_status ?? "").toLowerCase();
    return status === "cancelled" && refund === "pending";
  }).length;

  const protectionPlanRequests = bookingRows.filter((b) => {
    const p = deriveProtectionFields(b);
    return p.protection_selected && String(p.protection_status ?? "").toLowerCase() === "pending";
  }).length;

  const actionCenter: ActionCenterItem[] = [
    {
      id: "owner-kyc",
      label: "Owner KYC Pending",
      count: stats.pendingOwnerKyc,
      href: "/admin/owner-management?filter=pending-kyc",
      priority: priorityFromCount(stats.pendingOwnerKyc),
    },
    {
      id: "customer-kyc",
      label: "Customer KYC Pending",
      count: stats.pendingCustomerKyc,
      href: "/admin/customer-management?filter=pending-kyc",
      priority: priorityFromCount(stats.pendingCustomerKyc),
    },
    {
      id: "vehicle-approval",
      label: "Vehicle Approval Pending",
      count: stats.pendingVehicleApprovals,
      href: "/admin/vehicles?filter=pending",
      priority: priorityFromCount(stats.pendingVehicleApprovals, 3, 1),
    },
    {
      id: "booking-approval",
      label: "Booking Approval Pending",
      count: stats.pendingBookings,
      href: "/admin/bookings?filter=pending",
      priority: priorityFromCount(stats.pendingBookings, 10, 1),
    },
    {
      id: "refund-requests",
      label: "Refund Requests",
      count: refunds.pendingRefunds + refunds.approvedRefunds + refunds.processingRefunds,
      href: "/admin/refunds",
      priority: priorityFromCount(refunds.pendingRefunds, 3, 1),
    },
    {
      id: "cancellation-requests",
      label: "Cancellation Requests",
      count: cancellationRequests,
      href: "/admin/refunds",
      priority: priorityFromCount(cancellationRequests, 3, 1),
    },
    {
      id: "protection-requests",
      label: "Protection Plan Requests",
      count: protectionPlanRequests,
      href: "/admin/protection",
      priority: priorityFromCount(protectionPlanRequests),
    },
    {
      id: "document-verification",
      label: "Document Verification Pending",
      count: stats.pendingDocuments,
      href: "/admin/vehicles?filter=documents",
      priority: priorityFromCount(stats.pendingDocuments),
    },
  ];

  const completedTrips = bookingRows.filter(
    (b) => String(b.booking_status ?? "").toLowerCase() === "completed"
  ).length;
  const activeTrips = bookingRows.filter((b) => {
    const s = String(b.booking_status ?? "").toLowerCase();
    return s === "confirmed" || s === "active" || s === "in_progress";
  }).length;

  const todaysRevenue = analytics.dailyRevenue;
  const monthlyRevenue = stats.monthlyRevenue;
  const totalRevenue = stats.revenue;
  const protectionRevenue = protection.protectionRevenue;

  const pendingPayments = bookingRows.filter(
    (b) => String(b.payment_status ?? "").toLowerCase() === "pending"
  ).length;

  const summary = {
    totalOwners: stats.vehicleOwners,
    totalCustomers: stats.users,
    totalVehicles: stats.vehicles,
    activeVehicles: stats.approvedVehicles,
    todaysBookings: stats.todaysBookings,
    activeTrips,
    completedTrips,
    cancelledTrips: stats.cancelledBookings,
    todaysRevenue,
    monthlyRevenue,
    totalRevenue,
    protectionRevenue,
  };

  const finance = {
    todaysRevenue,
    monthlyRevenue,
    totalRevenue,
    refundAmount: refunds.completedRefundAmount,
    pendingPayments,
    protectionRevenue,
    commissionEarned: Math.round(totalRevenue * PLATFORM_COMMISSION_RATE),
  };

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  const activityFromNotifications: ActivityItem[] = notifications.slice(0, 15).map((n) => {
    const created = String(n.created_at ?? "");
    const { date, time } = formatActivityDate(created);
    return {
      id: String(n.id),
      date,
      time,
      user: String((n.metadata as { actor_name?: string } | undefined)?.actor_name ?? "System"),
      action: `${notificationActionLabel(String(n.type ?? ""))}: ${String(n.title ?? "")}`,
    };
  });

  const activityFromBookings: ActivityItem[] = (stats.recentBookings ?? []).slice(0, 5).map((b) => {
    const { date, time } = formatActivityDate(b.created_at);
    return {
      id: `booking-${b.id}`,
      date,
      time,
      user: b.booking_type,
      action: `Booking ${b.booking_status} — ${b.booking_type}`,
    };
  });

  const activityFromOwners: ActivityItem[] = (stats.recentOwners ?? []).slice(0, 5).map((o) => {
    const { date, time } = formatActivityDate(o.created_at);
    return {
      id: `owner-${o.id}`,
      date,
      time,
      user: o.owner_name,
      action: "Owner Registered",
    };
  });

  const activity = [...activityFromNotifications, ...activityFromBookings, ...activityFromOwners]
    .sort((a, b) => {
      const da = new Date(`${a.date} ${a.time}`).getTime();
      const db = new Date(`${b.date} ${b.time}`).getTime();
      return db - da;
    })
    .slice(0, 20);

  const pendingApprovals: PendingApprovalItem[] = [];

  for (const o of owners.filter((r) => r.kycStatus === "pending").slice(0, 8)) {
    const days = daysSince(o.created_at);
    pendingApprovals.push({
      id: `owner-kyc-${o.id}`,
      type: "Owner KYC",
      name: o.name,
      submittedAt: o.created_at,
      status: "Pending",
      priority: days >= 5 ? "urgent" : days >= 2 ? "high" : "medium",
      reviewHref: "/admin/owner-management",
    });
  }

  for (const c of customers.filter((r) => r.kycStatus === "pending").slice(0, 8)) {
    const days = daysSince(c.created_at);
    pendingApprovals.push({
      id: `customer-kyc-${c.id}`,
      type: "Customer KYC",
      name: c.name,
      submittedAt: c.created_at,
      status: "Pending",
      priority: days >= 5 ? "urgent" : days >= 2 ? "high" : "medium",
      reviewHref: "/admin/customer-management",
    });
  }

  for (const v of vehicles.filter((r) => r.approval_status === "pending").slice(0, 8)) {
    const days = daysSince(v.created_at ?? "");
    pendingApprovals.push({
      id: `vehicle-${v.id}`,
      type: "Vehicle",
      name: v.vehicle_name || v.registration_number,
      submittedAt: v.created_at ?? "",
      status: "Pending Review",
      priority: days >= 3 ? "urgent" : days >= 1 ? "high" : "medium",
      reviewHref: `/admin/vehicles/${v.id}`,
    });
  }

  for (const b of bookingRows.filter((r) => String(r.booking_status) === "pending").slice(0, 5)) {
    pendingApprovals.push({
      id: `booking-${b.id}`,
      type: "Booking",
      name: String(b.passenger_name ?? "Passenger"),
      submittedAt: String(b.created_at ?? ""),
      status: "Pending Approval",
      priority: "high",
      reviewHref: "/admin/bookings",
    });
  }

  if (refunds.pendingRefunds > 0) {
    pendingApprovals.push({
      id: "refunds-batch",
      type: "Refund",
      name: `${refunds.pendingRefunds} pending refund(s)`,
      submittedAt: new Date().toISOString(),
      status: "Pending",
      priority: refunds.pendingRefunds >= 3 ? "urgent" : "high",
      reviewHref: "/admin/refunds",
    });
  }

  const bookings: DashboardBookingRow[] = bookingRows.map((b) => {
    const vehicle = vehicleMap.get(String(b.vehicle_id ?? ""));
    const owner = ownerMap.get(String(b.owner_id ?? ""));
    const status = String(b.booking_status ?? "pending");
    const payment = String(b.payment_status ?? "pending");
    let tripStatus = status;
    if (status === "confirmed") tripStatus = "Active";
    if (status === "completed") tripStatus = "Completed";
    if (status === "cancelled") tripStatus = "Cancelled";
    if (String(b.refund_status) === "refunded") tripStatus = "Refunded";

    return {
      id: String(b.id),
      bookingReference: String(b.booking_reference ?? b.id).slice(0, 12),
      passenger: String(b.passenger_name ?? "Passenger"),
      vehicle: vehicle?.vehicle_name ?? vehicle?.registration_number ?? "—",
      owner: owner?.name ?? "—",
      paymentStatus: payment,
      bookingStatus: status,
      tripStatus,
      amount: Number(b.amount ?? 0),
      createdAt: String(b.created_at ?? ""),
    };
  });

  const reminders: ReminderItem[] = [];

  for (const v of vehicles.filter((r) => r.approval_status === "pending")) {
    const days = daysSince(v.created_at ?? "");
    if (days >= 1) {
      reminders.push({
        id: `reminder-vehicle-${v.id}`,
        message: `Vehicle "${v.vehicle_name || v.registration_number}" waiting for approval for ${days} day${days === 1 ? "" : "s"}.`,
        daysPending: days,
        overdue: days >= 3,
        href: `/admin/vehicles/${v.id}`,
      });
    }
  }

  for (const c of customers.filter((r) => r.kycStatus === "pending")) {
    const days = daysSince(c.created_at);
    if (days >= 2) {
      reminders.push({
        id: `reminder-customer-${c.id}`,
        message: `Customer KYC for ${c.name} pending for ${days} days.`,
        daysPending: days,
        overdue: days >= 5,
        href: "/admin/customer-management",
      });
    }
  }

  if (refunds.pendingRefunds > 0) {
    reminders.push({
      id: "reminder-refunds",
      message: `${refunds.pendingRefunds} refund request(s) pending review.`,
      daysPending: 5,
      overdue: true,
      href: "/admin/refunds",
    });
  }

  if (stats.pendingBookings > 0) {
    reminders.push({
      id: "reminder-bookings",
      message: `${stats.pendingBookings} booking(s) waiting for approval.`,
      daysPending: 1,
      overdue: stats.pendingBookings >= 5,
      href: "/admin/bookings",
    });
  }

  const topCities = analytics.topRoutes.slice(0, 8).map((r) => ({
    label: r.route.split("→")[0]?.trim() ?? r.route,
    value: r.count,
  }));

  return {
    actionCenter,
    summary,
    finance,
    activity,
    pendingApprovals: pendingApprovals.slice(0, 25),
    bookings,
    reminders: reminders.slice(0, 8),
    reports: {
      revenueTrend: stats.revenueTrend ?? [],
      bookingTrend: stats.bookingTrend ?? [],
      topCities,
      topOwners: analytics.topOwners.map((o) => ({ label: o.name, value: o.bookings })),
      topCustomers: [],
      vehicleCategories: stats.vehicleCategoryDistribution ?? [],
    },
    userManagement: {
      owners: stats.vehicleOwners,
      customers: stats.users,
      blocked: customers.filter((c) => c.is_blocked).length,
      verified:
        customers.filter((c) => c.kycStatus === "approved").length + stats.approvedOwnerKyc,
    },
    vehicleManagement: {
      pending: stats.pendingVehicles,
      approved: stats.approvedVehicles,
      rejected: stats.rejectedVehicles,
      inactive: vehicles.filter((v) => v.approval_status === "inactive").length,
      blocked: vehicles.filter((v) => v.approval_status === "blocked").length,
    },
  };
}
