import Link from "next/link";
import { CalendarPlus, Heart, Search, Shield, User, Wallet } from "lucide-react";

const ACTIONS = [
  { href: "/search", label: "Book Ride", icon: Search, accent: "from-primary to-secondary" },
  { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarPlus, accent: "from-blue-500 to-blue-700" },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet, accent: "from-emerald-500 to-emerald-700" },
  { href: "/dashboard/saved", label: "Saved", icon: Heart, accent: "from-pink-500 to-rose-600" },
  { href: "/dashboard/kyc", label: "KYC", icon: Shield, accent: "from-violet-500 to-violet-700" },
  { href: "/dashboard/profile", label: "Profile", icon: User, accent: "from-gray-600 to-gray-800" },
];

export default function QuickActions() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold text-secondary">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.accent} text-white shadow-sm`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-secondary">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
