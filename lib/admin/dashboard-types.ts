export type ActionPriority = "urgent" | "high" | "medium" | "completed";

export interface ActionCenterItem {
  id: string;
  label: string;
  count: number;
  href: string;
  priority: ActionPriority;
}

export interface PendingApprovalItem {
  id: string;
  type: string;
  name: string;
  submittedAt: string;
  status: string;
  priority: ActionPriority;
  reviewHref: string;
}

export interface ActivityItem {
  id: string;
  date: string;
  time: string;
  user: string;
  action: string;
}

export interface ReminderItem {
  id: string;
  message: string;
  daysPending: number;
  overdue: boolean;
  href: string;
}

export interface DashboardBookingRow {
  id: string;
  bookingReference: string;
  passenger: string;
  vehicle: string;
  owner: string;
  paymentStatus: string;
  bookingStatus: string;
  tripStatus: string;
  amount: number;
  createdAt: string;
}

export interface AdminDashboardData {
  actionCenter: ActionCenterItem[];
  summary: {
    totalOwners: number;
    totalCustomers: number;
    totalVehicles: number;
    activeVehicles: number;
    todaysBookings: number;
    activeTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    todaysRevenue: number;
    monthlyRevenue: number;
    totalRevenue: number;
    protectionRevenue: number;
  };
  finance: {
    todaysRevenue: number;
    monthlyRevenue: number;
    totalRevenue: number;
    refundAmount: number;
    pendingPayments: number;
    protectionRevenue: number;
    commissionEarned: number;
  };
  activity: ActivityItem[];
  pendingApprovals: PendingApprovalItem[];
  bookings: DashboardBookingRow[];
  reminders: ReminderItem[];
  reports: {
    revenueTrend: { label: string; value: number }[];
    bookingTrend: { label: string; value: number }[];
    topCities: { label: string; value: number }[];
    topOwners: { label: string; value: number }[];
    topCustomers: { label: string; value: number }[];
    vehicleCategories: { label: string; value: number }[];
  };
  userManagement: {
    owners: number;
    customers: number;
    blocked: number;
    verified: number;
  };
  vehicleManagement: {
    pending: number;
    approved: number;
    rejected: number;
    inactive: number;
    blocked: number;
  };
}

export function filterBookingsByStatus(
  bookings: DashboardBookingRow[],
  filter: string
): DashboardBookingRow[] {
  const f = filter.toLowerCase();
  if (f === "all" || !f) return bookings;
  if (f === "refunded") return bookings.filter((b) => b.tripStatus === "Refunded");
  if (f === "active")
    return bookings.filter(
      (b) =>
        ["Active", "confirmed"].includes(b.tripStatus) || b.bookingStatus === "confirmed"
    );
  if (f === "approved") return bookings.filter((b) => b.bookingStatus === "confirmed");
  return bookings.filter(
    (b) => b.bookingStatus.toLowerCase() === f || b.paymentStatus.toLowerCase() === f
  );
}

export function filterDashboardByDateRange<T extends { createdAt?: string; date?: string }>(
  items: T[],
  range: string,
  dateKey: "createdAt" | "date" = "createdAt"
): T[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  return items.filter((item) => {
    const raw = dateKey === "createdAt" ? item.createdAt : item.date;
    if (!raw) return true;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return true;
    switch (range) {
      case "today":
        return d >= todayStart;
      case "yesterday":
        return d >= yesterdayStart && d < todayStart;
      case "7days":
        return d >= weekStart;
      case "month":
        return d >= monthStart;
      case "year":
        return d >= yearStart;
      default:
        return true;
    }
  });
}
