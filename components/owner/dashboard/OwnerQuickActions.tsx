import Link from "next/link";
import {
  BarChart3,
  Bell,
  Car,
  Headphones,
  IndianRupee,
  Wallet,
} from "lucide-react";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

const ACTIONS = [
  { href: "/owner/my-vehicles", label: "My Vehicles", icon: Car, gradient: "from-primary to-secondary" },
  { href: "/owner/bookings", label: "Bookings", icon: Car, gradient: "from-blue-600 to-indigo-700" },
  { href: "/owner/earnings", label: "Wallet", icon: Wallet, gradient: "from-violet-600 to-purple-800" },
  { href: "/owner/earnings", label: "Withdraw Earnings", icon: IndianRupee, gradient: "from-emerald-600 to-teal-700" },
  { href: "/owner/reports", label: "Reports", icon: BarChart3, gradient: "from-amber-500 to-orange-600" },
  { href: "/owner/notifications", label: "Notifications", icon: Bell, gradient: "from-rose-500 to-pink-600" },
  { href: "/owner/support", label: "Support", icon: Headphones, gradient: "from-cyan-600 to-blue-700" },
];

export default function OwnerQuickActions() {
  return (
    <OwnerSection title="Quick Actions" description="Frequently used host tools">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={`${a.href}-${a.label}`}
              href={a.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-md transition group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-center text-xs font-semibold leading-tight text-secondary">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </OwnerSection>
  );
}
