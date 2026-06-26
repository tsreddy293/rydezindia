import type { User } from "@supabase/supabase-js";
import type {
  RiderActionItem,
  RiderDashboardBooking,
  RiderDashboardData,
  RiderReminderItem,
  RiderSavedVehicle,
} from "@/lib/rider/dashboard-types";
import type { MyBookingRecord } from "@/types/database";
import { getSavedVehicles, getMyBookingsForUser } from "@/lib/supabase/queries";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { fetchLoyaltyStatus, fetchReferralStats, fetchWalletData } from "@/server/actions/phase2";
import { shouldShowRiderKyc } from "@/lib/services/customer-profile";
import { getRiderBookingProfile, getRiderDisplayName } from "@/lib/users/rider-profile";

function priorityFromCount(count: number): RiderActionItem["priority"] {
  if (count === 0) return "completed";
  if (count >= 3) return "urgent";
  if (count >= 1) return "high";
  return "medium";
}

function mapBooking(b: MyBookingRecord): RiderDashboardBooking {
  return {
    id: b.id,
    bookingReference: b.booking_reference ?? b.id.slice(0, 8),
    bookingType: b.booking_type,
    passengerName: b.passenger_name,
    amount: b.amount,
    bookingStatus: b.booking_status,
    paymentStatus: b.payment_status,
    pickupLocation: b.pickup_location,
    dropLocation: b.drop_location,
    pickupDate: b.pickup_date,
    pickupTime: b.pickup_time,
    vehicleName: b.vehicle_name,
    vehicleImage: b.vehicle_image,
    createdAt: b.created_at,
    cancellationStatus: b.cancellation_status,
    cancelledAt: b.cancelled_at,
    cancelledByRole: b.cancelled_by_role,
    refundStatus: b.refund_status,
  };
}

function findUpcomingTrip(bookings: RiderDashboardBooking[]): RiderDashboardBooking | null {
  const candidates = bookings.filter((b) => {
    const s = b.bookingStatus.toLowerCase();
    return s === "confirmed" || s === "pending";
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    const da = a.pickupDate ? new Date(a.pickupDate).getTime() : new Date(a.createdAt).getTime();
    const db = b.pickupDate ? new Date(b.pickupDate).getTime() : new Date(b.createdAt).getTime();
    return da - db;
  })[0];
}

export async function getRiderDashboardData(user: User): Promise<RiderDashboardData> {
  const userId = user.id;

  const [
    bookingsRaw,
    savedRaw,
    kyc,
    displayName,
    showKycSection,
    profile,
    walletData,
    referralStats,
    loyalty,
  ] = await Promise.all([
    getMyBookingsForUser(userId),
    getSavedVehicles(userId),
    getCustomerKycStatus(userId),
    getRiderDisplayName(userId, "Rider"),
    shouldShowRiderKyc(userId),
    getRiderBookingProfile(userId, {
      email: user.email,
      name: String(user.user_metadata?.name ?? ""),
      mobile: String(user.user_metadata?.mobile ?? ""),
    }),
    fetchWalletData(),
    fetchReferralStats(),
    fetchLoyaltyStatus(userId),
  ]);

  const bookings = bookingsRaw.map(mapBooking);
  const activeTrips = bookings.filter((b) =>
    ["confirmed", "pending", "active"].includes(b.bookingStatus.toLowerCase())
  );
  const completedTrips = bookings.filter((b) => b.bookingStatus.toLowerCase() === "completed");

  const paymentPending = bookings.filter(
    (b) =>
      b.paymentStatus.toLowerCase() === "pending" &&
      !["cancelled", "completed"].includes(b.bookingStatus.toLowerCase())
  ).length;

  const upcomingRide = activeTrips.filter((b) => b.bookingStatus.toLowerCase() === "confirmed").length;

  const kycPending =
    showKycSection && (kyc.status === "pending" || kyc.status === "not_submitted" || kyc.status === "rejected")
      ? 1
      : 0;

  const refundAvailable = bookings.filter((b) => {
    const rs = String(b.refundStatus ?? "").toLowerCase();
    return rs === "pending" || rs === "approved" || rs === "processing";
  }).length;

  const profileComplete = Boolean(profile.mobile && profile.name && profile.email);
  const profileIncomplete = profileComplete ? 0 : 1;

  const actionCenter: RiderActionItem[] = [
    {
      id: "payment-pending",
      label: "Payment Pending",
      count: paymentPending,
      href: "/dashboard/bookings?filter=pending",
      priority: priorityFromCount(paymentPending),
    },
    {
      id: "upcoming-ride",
      label: "Upcoming Ride",
      count: upcomingRide,
      href: "/dashboard/bookings",
      priority: priorityFromCount(upcomingRide),
    },
    {
      id: "kyc-pending",
      label: "KYC Pending",
      count: kycPending,
      href: "/dashboard/kyc",
      priority: kyc.status === "rejected" ? "urgent" : priorityFromCount(kycPending),
    },
    {
      id: "refund-available",
      label: "Refund Available",
      count: refundAvailable,
      href: "/dashboard/bookings",
      priority: priorityFromCount(refundAvailable),
    },
    {
      id: "profile-incomplete",
      label: "Profile Incomplete",
      count: profileIncomplete,
      href: "/dashboard/profile",
      priority: priorityFromCount(profileIncomplete),
    },
  ];

  const reminders: RiderReminderItem[] = [];

  if (paymentPending > 0) {
    reminders.push({
      id: "reminder-payment",
      message: `${paymentPending} booking(s) have pending payment.`,
      href: "/dashboard/bookings",
      urgent: true,
    });
  }

  const upcoming = findUpcomingTrip(bookings);
  if (upcoming) {
    reminders.push({
      id: "reminder-upcoming",
      message: `Upcoming trip to ${upcoming.dropLocation ?? "your destination"} — ${upcoming.bookingReference}.`,
      href: `/booking/${upcoming.id}`,
      urgent: false,
    });
  }

  if (kycPending > 0) {
    reminders.push({
      id: "reminder-kyc",
      message:
        kyc.status === "rejected"
          ? "KYC was rejected. Please re-upload your documents."
          : "Complete KYC verification for self-drive bookings.",
      href: "/dashboard/kyc",
      urgent: kyc.status === "rejected",
    });
  }

  if (refundAvailable > 0) {
    reminders.push({
      id: "reminder-refund",
      message: `${refundAvailable} refund(s) are being processed or available.`,
      href: "/dashboard/bookings",
      urgent: false,
    });
  }

  if (!profileComplete) {
    reminders.push({
      id: "reminder-profile",
      message: "Complete your profile for a smoother booking experience.",
      href: "/dashboard/profile",
      urgent: false,
    });
  }

  const savedVehicles: RiderSavedVehicle[] = savedRaw.map((item) => {
    const row = item as Record<string, unknown>;
    const vehicle = row.vehicles as Record<string, unknown> | null;
    return {
      id: String(row.id),
      vehicleId: String(row.vehicle_id ?? ""),
      listingId: row.listing_id ? String(row.listing_id) : undefined,
      name: String(vehicle?.vehicle_name ?? "Vehicle"),
      type: String(vehicle?.vehicle_type ?? ""),
    };
  });

  const recentTransactions = (walletData.transactions as Array<Record<string, unknown>>)
    .slice(0, 5)
    .map((tx) => ({
      id: String(tx.id),
      type: String(tx.type ?? ""),
      amount: Number(tx.amount ?? 0),
      description: String(tx.description ?? tx.source ?? "Transaction"),
      createdAt: String(tx.created_at ?? ""),
    }));

  return {
    displayName,
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
    showKycSection,
    kycStatus: kyc.status,
    profileComplete,
    stats: {
      totalBookings: bookings.length,
      activeTrips: activeTrips.length,
      completedTrips: completedTrips.length,
      savedVehicles: savedVehicles.length,
      walletBalance: walletData.balance,
      rewardPoints: loyalty.points,
      loyaltyTier: loyalty.tier,
      referralEarnings: referralStats.earnings,
    },
    actionCenter,
    reminders: reminders.slice(0, 6),
    upcomingTrip: upcoming,
    recentBookings: bookings.slice(0, 6),
    timelineBooking: upcoming ?? bookings[0] ?? null,
    savedVehicles: savedVehicles.slice(0, 6),
    wallet: {
      balance: walletData.balance,
      recentTransactions,
    },
    referrals: {
      code: referralStats.referralCode,
      totalReferrals: referralStats.totalReferrals,
      successfulReferrals: referralStats.successfulReferrals,
      earnings: referralStats.earnings,
    },
    loyalty: {
      tier: loyalty.tier,
      points: loyalty.points,
      discountPercent: loyalty.discountPercent,
      nextTier: loyalty.nextTier ?? undefined,
      pointsToNext: loyalty.pointsToNext ?? undefined,
    },
  };
}
