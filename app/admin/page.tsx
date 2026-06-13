import {
  Users,
  Car,
  CalendarCheck,
  IndianRupee,
  Shield,
  MapPin,
  Route,
} from "lucide-react";
import { getPlatformStats } from "@/lib/supabase/queries";
import { testSupabaseConnection } from "@/lib/supabase/admin";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const connection = await testSupabaseConnection();
  const stats = connection.ok
    ? await getPlatformStats()
    : {
        users: 0,
        vehicleOwners: 0,
        vehicles: 0,
        vehiclesTableCount: 0,
        bookings: 0,
        returnJourneys: 0,
        revenue: 0,
        error: connection.message,
      };

  const cards = [
    { icon: Shield, label: "Total Owners", value: stats.vehicleOwners.toLocaleString("en-IN") },
    { icon: Car, label: "Total Vehicles", value: stats.vehicles.toLocaleString("en-IN") },
    { icon: Route, label: "Return Journeys", value: stats.returnJourneys.toLocaleString("en-IN") },
    { icon: CalendarCheck, label: "Total Bookings", value: stats.bookings.toLocaleString("en-IN") },
    { icon: Users, label: "Total Users", value: stats.users.toLocaleString("en-IN") },
    { icon: IndianRupee, label: "Total Revenue", value: formatINR(stats.revenue) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-secondary text-white px-6 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Rydez India Admin</h1>
            <p className="text-white/60 text-sm mt-0.5">
              {connection.ok ? "Live platform dashboard" : "Connection error"}
            </p>
          </div>
          <a href="/" className="text-sm text-white/70 hover:text-white transition-colors">
            ← Back to Site
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {!connection.ok && (
          <div className="mb-8">
            <SupabaseErrorBanner message={connection.message} />
          </div>
        )}

        {connection.ok && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            ✓ {connection.message}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
          {cards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
              <Icon className="h-6 w-6 text-primary mb-3" />
              <p className="text-2xl font-bold text-secondary">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
              {label === "Total Vehicles" && (
                <p className="text-xs text-gray-400 mt-1">
                  {stats.returnJourneys} journeys + {stats.vehiclesTableCount} table
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Live Counts (Supabase)
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Owners</span>
                <span className="font-semibold text-secondary">{stats.vehicleOwners}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Return Journeys (listings)</span>
                <span className="font-semibold text-secondary">{stats.returnJourneys}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Vehicles Table</span>
                <span className="font-semibold text-secondary">{stats.vehiclesTableCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Total Vehicles</span>
                <span className="font-semibold text-primary">{stats.vehicles}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Bookings</span>
                <span className="font-semibold text-secondary">{stats.bookings}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">Revenue</span>
                <span className="font-semibold text-secondary">{formatINR(stats.revenue)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Users</span>
                <span className="font-semibold text-secondary">{stats.users}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary mb-4">Quick Links</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { href: "/owner", label: "Owner Registration" },
                { href: "/vehicles/add", label: "Add Vehicle" },
                { href: "/search", label: "Search Vehicles" },
                { href: "/contact", label: "Contact" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-secondary hover:bg-primary/5 hover:border-primary/20 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
