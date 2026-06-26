import { filterActionablePendingPaymentBookings } from "@/lib/owner/booking-eligibility";

export type OwnerActionPriority = "urgent" | "high" | "medium" | "low" | "info" | "success";

export type OwnerActionIcon =
  | "car"
  | "shield"
  | "calendar"
  | "credit-card"
  | "truck"
  | "file-warning"
  | "bell"
  | "file-text"
  | "alert-circle"
  | "check-circle";

export interface OwnerActionItem {
  id: string;
  label: string;
  description: string;
  count: number;
  href: string;
  priority: OwnerActionPriority;
  actionLabel: string;
  icon: OwnerActionIcon;
}

export interface OwnerDocumentReminder {
  id: string;
  label: string;
  description: string;
  href: string;
  priority: "urgent" | "high" | "medium";
}

export interface OwnerDashboardBooking {
  id: string;
  bookingReference: string;
  passengerName: string;
  bookingType: string;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  createdAt: string;
}

export interface OwnerDashboardVehicle {
  id: string;
  name: string;
  registrationNumber: string;
  category: string;
  status: string;
  city?: string;
  dailyFare?: number;
  imageUrl?: string | null;
  isActive?: boolean;
  hasRc?: boolean;
  hasInsurance?: boolean;
}

export interface OwnerNotificationPreview {
  id: string;
  title: string;
  message: string;
  read: boolean;
  href: string;
  createdAt: string;
}

export interface OwnerPerformanceMetrics {
  responseRate: number;
  acceptanceRate: number;
  cancellationRate: number;
  averageRating: number;
  completedTrips: number;
  totalReviews: number;
  performanceScore: number;
}

export interface OwnerDashboardData {
  displayName: string;
  kycStatus: string;
  ownerStatus: string;
  verificationLabel: string;
  walletBalance: number;
  memberSince: string;
  averageRating: number;
  reviewCount: number;
  stats: {
    totalVehicles: number;
    activeVehicles: number;
    pendingApproval: number;
    bookedVehicles: number;
    availableVehicles: number;
    todaysBookings: number;
    monthlyBookings: number;
    upcomingTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    totalEarnings: number;
    pendingPayments: number;
    averageRating: number;
    reviewCount: number;
    earningsToday: number;
    earningsThisMonth: number;
    activeBookings: number;
    vehicleUtilization: number;
    walletBalance: number;
    pendingSettlement: number;
  };
  actionCenter: OwnerActionItem[];
  documentReminders: OwnerDocumentReminder[];
  vehicles: OwnerDashboardVehicle[];
  recentBookings: OwnerDashboardBooking[];
  upcomingBookings: OwnerDashboardBooking[];
  earnings: {
    today: number;
    week: number;
    month: number;
    lifetime: number;
    pendingSettlement: number;
  };
  reports: {
    revenueTrend: { label: string; value: number }[];
    bookingTrend: { label: string; value: number }[];
    topVehicle: { name: string; bookings: number } | null;
    cancellationRate: number;
    utilizationPercent: number;
  };
  performance: OwnerPerformanceMetrics;
  revenueGoal: { current: number; target: number };
  activity: Array<{ id: string; date: string; action: string }>;
  notifications: OwnerNotificationPreview[];
  unreadNotificationCount: number;
}

export const OWNER_PRIORITY_STYLES: Record<
  OwnerActionPriority,
  { border: string; bg: string; text: string; badge: string; dot: string }
> = {
  urgent: {
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-900",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  high: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-900",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  low: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-900",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    text: "text-sky-900",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  },
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

export function filterOwnerBookings(
  bookings: OwnerDashboardBooking[],
  filter: string
): OwnerDashboardBooking[] {
  const f = filter.toLowerCase();
  if (!f || f === "all") return bookings;
  if (f === "payment_pending") return filterActionablePendingPaymentBookings(bookings);
  if (f === "ongoing") return bookings.filter((b) => ["confirmed", "active"].includes(b.bookingStatus.toLowerCase()));
  if (f === "upcoming") return bookings.filter((b) => ["pending", "confirmed"].includes(b.bookingStatus.toLowerCase()));
  return bookings.filter((b) => b.bookingStatus.toLowerCase() === f);
}
