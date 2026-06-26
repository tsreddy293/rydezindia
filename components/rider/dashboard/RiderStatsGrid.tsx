import { CalendarCheck, Car, Heart, IndianRupee, Sparkles, Wallet } from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { RiderDashboardData } from "@/lib/rider/dashboard-types";

const STAT_ITEMS: Array<{
  key: keyof RiderDashboardData["stats"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  format?: "inr" | "number" | "text";
}> = [
  { key: "totalBookings", label: "Total Bookings", icon: CalendarCheck, format: "number" },
  { key: "activeTrips", label: "Active Trips", icon: Car, format: "number" },
  { key: "completedTrips", label: "Completed", icon: CalendarCheck, format: "number" },
  { key: "savedVehicles", label: "Saved", icon: Heart, format: "number" },
  { key: "walletBalance", label: "Wallet", icon: Wallet, format: "inr" },
  { key: "rewardPoints", label: "Reward Points", icon: Sparkles, format: "number" },
];

export default function RiderStatsGrid({ stats }: { stats: RiderDashboardData["stats"] }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-secondary">Your Overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_ITEMS.map(({ key, label, icon: Icon, format }) => {
          const value = stats[key];
          const display =
            format === "inr"
              ? formatINR(Number(value))
              : format === "text"
                ? String(value)
                : Number(value).toLocaleString("en-IN");
          return (
            <div
              key={key}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-secondary">{display}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          );
        })}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <IndianRupee className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-2xl font-bold text-secondary">{formatINR(stats.referralEarnings)}</p>
          <p className="text-sm text-gray-500">Referral Earnings</p>
        </div>
      </div>
    </section>
  );
}
