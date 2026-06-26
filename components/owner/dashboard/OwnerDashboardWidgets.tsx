import Link from "next/link";
import {
  Calendar,
  Cloud,
  FileWarning,
  IndianRupee,
  MessageSquare,
  Percent,
  Star,
  Sun,
} from "lucide-react";
import type { OwnerDashboardData } from "@/lib/owner/dashboard-types";
import { formatINR } from "@/lib/utils";

export default function OwnerDashboardWidgets({ data }: { data: OwnerDashboardData }) {
  const widgets = [
    { icon: Calendar, label: "Today's Trips", value: String(data.stats.todaysBookings), href: "/owner/bookings", color: "blue" },
    { icon: Calendar, label: "Upcoming Trips", value: String(data.stats.upcomingTrips), href: "/owner/bookings", color: "blue" },
    { icon: Percent, label: "Vehicle Occupancy", value: `${data.stats.vehicleUtilization}%`, href: "/owner/reports", color: "violet" },
    { icon: Star, label: "Average Rating", value: data.averageRating.toFixed(1), href: "/owner/reviews", color: "amber" },
    { icon: FileWarning, label: "Pending Documents", value: String(data.documentReminders.length), href: "/owner/kyc", color: "orange" },
    { icon: IndianRupee, label: "Pending Payments", value: String(data.stats.pendingPayments), href: "/owner/payments", color: "orange" },
    { icon: MessageSquare, label: "Unread Notifications", value: String(data.unreadNotificationCount), href: "/owner/notifications", color: "rose" },
    { icon: IndianRupee, label: "Quick Earnings", value: formatINR(data.stats.earningsToday), href: "/owner/earnings", color: "emerald" },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-600/5 text-blue-600",
    violet: "from-violet-500/10 to-violet-600/5 text-violet-600",
    amber: "from-amber-500/10 to-amber-600/5 text-amber-600",
    orange: "from-orange-500/10 to-orange-600/5 text-orange-600",
    rose: "from-rose-500/10 to-rose-600/5 text-rose-600",
    emerald: "from-emerald-500/10 to-emerald-600/5 text-emerald-600",
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-secondary">Live Widgets</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => {
          const Icon = w.icon;
          return (
            <Link
              key={w.label}
              href={w.href}
              className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${colorMap[w.color]}`}
            >
              <Icon className="mb-2 h-5 w-5" />
              <p className="text-2xl font-bold text-secondary">{w.value}</p>
              <p className="text-xs font-medium text-gray-600">{w.label}</p>
            </Link>
          );
        })}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-500/10 to-sky-600/5 p-4 shadow-sm">
          <Sun className="mb-2 h-5 w-5 text-sky-600" />
          <p className="text-lg font-bold text-secondary">28°C</p>
          <p className="text-xs text-gray-600 flex items-center gap-1"><Cloud className="h-3 w-3" /> Clear · Good for trips</p>
        </div>
        {data.documentReminders.length > 0 && (
          <Link href="/owner/kyc" className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:col-span-2 lg:col-span-4">
            <p className="text-sm font-semibold text-orange-900">⚠️ Expiring / Missing Documents</p>
            <p className="text-xs text-orange-700">{data.documentReminders.map((d) => d.label).join(" · ")}</p>
          </Link>
        )}
      </div>
    </section>
  );
}
