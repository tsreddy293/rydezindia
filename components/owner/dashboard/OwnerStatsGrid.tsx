import {
  Calendar,
  Car,
  CheckCircle,
  Clock,
  IndianRupee,
  Percent,
  Star,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { OwnerDashboardData } from "@/lib/owner/dashboard-types";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";
import OwnerStatCard from "@/components/owner/dashboard/ui/OwnerStatCard";

export default function OwnerStatsGrid({ stats }: { stats: OwnerDashboardData["stats"] }) {
  const cards = [
    { label: "Total Vehicles", value: stats.totalVehicles.toLocaleString("en-IN"), icon: Car, accent: "primary" as const },
    { label: "Available Vehicles", value: stats.availableVehicles.toLocaleString("en-IN"), icon: CheckCircle, accent: "emerald" as const },
    { label: "Booked Vehicles", value: stats.bookedVehicles.toLocaleString("en-IN"), icon: Calendar, accent: "blue" as const },
    { label: "Pending Approval", value: stats.pendingApproval.toLocaleString("en-IN"), icon: Clock, accent: "orange" as const },
    { label: "Today's Bookings", value: stats.todaysBookings.toLocaleString("en-IN"), icon: Calendar, accent: "blue" as const },
    { label: "Upcoming Trips", value: stats.upcomingTrips.toLocaleString("en-IN"), icon: TrendingUp, accent: "blue" as const },
    { label: "Completed Trips", value: stats.completedTrips.toLocaleString("en-IN"), icon: CheckCircle, accent: "emerald" as const },
    { label: "Cancelled Trips", value: stats.cancelledTrips.toLocaleString("en-IN"), icon: XCircle, accent: "red" as const },
    { label: "Today's Earnings", value: formatINR(stats.earningsToday), icon: IndianRupee, accent: "emerald" as const },
    { label: "Monthly Earnings", value: formatINR(stats.earningsThisMonth), icon: IndianRupee, accent: "primary" as const },
    { label: "Pending Settlement", value: formatINR(stats.pendingSettlement), icon: Clock, accent: "orange" as const },
    { label: "Wallet Balance", value: formatINR(stats.walletBalance), icon: Wallet, accent: "primary" as const },
    { label: "Average Rating", value: `${stats.averageRating.toFixed(1)} ★`, icon: Star, accent: "orange" as const },
    { label: "Total Reviews", value: stats.reviewCount.toLocaleString("en-IN"), icon: Star, accent: "gray" as const },
    { label: "Vehicle Utilization", value: `${stats.vehicleUtilization}%`, icon: Percent, accent: "blue" as const },
  ];

  return (
    <OwnerSection title="Business Overview" description="Fleet and revenue at a glance">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <OwnerStatCard key={card.label} {...card} />
        ))}
      </div>
    </OwnerSection>
  );
}
