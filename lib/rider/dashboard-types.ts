export type RiderActionPriority = "urgent" | "high" | "medium" | "completed";

export interface RiderActionItem {
  id: string;
  label: string;
  count: number;
  href: string;
  priority: RiderActionPriority;
}

export interface RiderReminderItem {
  id: string;
  message: string;
  href: string;
  urgent: boolean;
}

export interface RiderDashboardBooking {
  id: string;
  bookingReference: string;
  bookingType: string;
  passengerName: string;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  vehicleName?: string;
  vehicleImage?: string | null;
  createdAt: string;
  cancellationStatus?: string | null;
  cancelledAt?: string | null;
  cancelledByRole?: string | null;
  refundStatus?: string | null;
}

export interface RiderSavedVehicle {
  id: string;
  vehicleId: string;
  listingId?: string;
  name: string;
  type: string;
}

export interface RiderDashboardData {
  displayName: string;
  firstName: string;
  memberSince: string;
  verificationLabel: string;
  averageRating: number | null;
  emailVerified: boolean;
  showKycSection: boolean;
  kycStatus: string;
  profileComplete: boolean;
  stats: {
    totalBookings: number;
    activeTrips: number;
    completedTrips: number;
    savedVehicles: number;
    walletBalance: number;
    rewardPoints: number;
    loyaltyTier: string;
    referralEarnings: number;
  };
  actionCenter: RiderActionItem[];
  reminders: RiderReminderItem[];
  upcomingTrip: RiderDashboardBooking | null;
  recentBookings: RiderDashboardBooking[];
  timelineBooking: RiderDashboardBooking | null;
  savedVehicles: RiderSavedVehicle[];
  wallet: {
    balance: number;
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      description: string;
      createdAt: string;
    }>;
  };
  referrals: {
    code: string;
    totalReferrals: number;
    successfulReferrals: number;
    earnings: number;
  };
  loyalty: {
    tier: string;
    points: number;
    discountPercent: number;
    nextTier?: string;
    pointsToNext?: number;
  };
}

export const RIDER_PRIORITY_STYLES: Record<
  RiderActionPriority,
  { border: string; bg: string; text: string; badge: string }
> = {
  urgent: { border: "border-red-200", bg: "bg-red-50", text: "text-red-800", badge: "bg-red-100 text-red-700" },
  high: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
  medium: { border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
  completed: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
};
