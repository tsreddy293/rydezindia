"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, Car, CheckCircle2, Search, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import MyBookingCard from "@/components/dashboard/my-bookings/MyBookingCard";
import {
  filterBookingsByTab,
  type BookingFilterTab,
} from "@/lib/bookings/my-bookings-utils";
import type { MyBookingRecord } from "@/types/database";

interface Props {
  bookings: MyBookingRecord[];
}

const TABS: { key: BookingFilterTab; label: string; icon: typeof Car }[] = [
  { key: "all", label: "All Bookings", icon: Car },
  { key: "active", label: "Active", icon: CalendarCheck },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
];

export default function MyBookingsClient({ bookings }: Props) {
  const [tab, setTab] = useState<BookingFilterTab>("all");

  const filtered = useMemo(() => filterBookingsByTab(bookings, tab), [bookings, tab]);

  const stats = useMemo(() => {
    const active = filterBookingsByTab(bookings, "active").length;
    const completed = filterBookingsByTab(bookings, "completed").length;
    const cancelled = filterBookingsByTab(bookings, "cancelled").length;
    return { total: bookings.length, active, completed, cancelled };
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "from-primary/10 to-blue-500/10 text-primary" },
          { label: "Active", value: stats.active, color: "from-emerald-500/10 to-teal-500/10 text-emerald-700" },
          { label: "Completed", value: stats.completed, color: "from-slate-500/10 to-gray-500/10 text-slate-700" },
          { label: "Cancelled", value: stats.cancelled, color: "from-red-500/10 to-rose-500/10 text-red-700" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border border-gray-100 bg-gradient-to-br ${stat.color} p-4 shadow-sm transition-transform duration-300 hover:-translate-y-0.5`}
          >
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              tab === key
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "text-gray-600 hover:bg-gray-50 hover:text-secondary"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <Car className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-600 font-medium">
            {bookings.length === 0 ? "No bookings found." : "No bookings in this category"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {bookings.length === 0
              ? "Search vehicles and book your next trip with Rydez India."
              : "Try another filter or book a new ride."}
          </p>
          <Button href="/search" variant="primary" className="mt-6">
            <Search className="h-4 w-4 mr-1.5" />
            Search Vehicles
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <MyBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
