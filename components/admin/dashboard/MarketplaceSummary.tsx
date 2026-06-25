import {
  CalendarCheck,
  Car,
  CheckCircle2,
  IndianRupee,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { formatINR } from "@/lib/utils";
import type { AdminDashboardData } from "@/lib/admin/dashboard-types";

const SUMMARY_CONFIG: Array<{
  key: keyof AdminDashboardData["summary"];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  format?: "inr" | "number";
}> = [
  { key: "totalOwners", label: "Total Owners", icon: Users, format: "number" },
  { key: "totalCustomers", label: "Total Customers", icon: Users, format: "number" },
  { key: "totalVehicles", label: "Total Vehicles", icon: Car, format: "number" },
  { key: "activeVehicles", label: "Active Vehicles", icon: CheckCircle2, format: "number" },
  { key: "todaysBookings", label: "Today's Bookings", icon: CalendarCheck, format: "number" },
  { key: "activeTrips", label: "Active Trips", icon: CalendarCheck, format: "number" },
  { key: "completedTrips", label: "Completed Trips", icon: CheckCircle2, format: "number" },
  { key: "cancelledTrips", label: "Cancelled Trips", icon: XCircle, format: "number" },
  { key: "todaysRevenue", label: "Today's Revenue", icon: IndianRupee, format: "inr" },
  { key: "monthlyRevenue", label: "Monthly Revenue", icon: IndianRupee, format: "inr" },
  { key: "totalRevenue", label: "Total Revenue", icon: IndianRupee, format: "inr" },
  { key: "protectionRevenue", label: "Protection Revenue", icon: Shield, format: "inr" },
];

export default function MarketplaceSummary({ summary }: { summary: AdminDashboardData["summary"] }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-secondary">Marketplace Summary</h2>
        <p className="text-sm text-gray-500">Platform overview at a glance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SUMMARY_CONFIG.map(({ key, label, icon: Icon, format }) => {
          const value = summary[key];
          const display =
            format === "inr" ? formatINR(Number(value)) : Number(value).toLocaleString("en-IN");
          return (
            <div
              key={key}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-secondary">{display}</p>
              <p className="mt-1 text-sm text-gray-500">{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
