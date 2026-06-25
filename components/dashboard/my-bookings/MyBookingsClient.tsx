"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function MyBookingsClient({ bookings: initialBookings }: Props) {
  const [tab, setTab] = useState<BookingFilterTab>("all");
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [localBookings, setLocalBookings] = useState(initialBookings);

  useEffect(() => {
    setLocalBookings(initialBookings);
  }, [initialBookings]);

  const filtered = useMemo(() => filterBookingsByTab(localBookings, tab), [localBookings, tab]);

  const stats = useMemo(() => {
    const active = filterBookingsByTab(localBookings, "active").length;
    const completed = filterBookingsByTab(localBookings, "completed").length;
    const cancelled = filterBookingsByTab(localBookings, "cancelled").length;
    return { total: localBookings.length, active, completed, cancelled };
  }, [localBookings]);

  function handleBookingCancelled(message?: string, bookingId?: string) {
    if (bookingId) {
      setLocalBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                booking_status: "cancelled",
                cancellation_status: "cancelled",
                cancelled_at: new Date().toISOString(),
                cancelled_by_role: "rider",
                refund_status: b.payment_status === "paid" ? "pending" : "not_required",
                refund_amount: 0,
              }
            : b
        )
      );
    }
    setTab("cancelled");
    const text = message ?? "✓ Booking cancelled successfully.";
    setSuccessToast(text);
    window.setTimeout(() => setSuccessToast(null), 5000);
  }

  return (
    <div className="space-y-6">
      {successToast && (
        <div
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-[fadeUp_0.25s_ease-out]"
          role="status"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successToast}
        </div>
      )}

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

      {filtered.length === 0 ? (
        <CancelledEmptyState tab={tab} hasAnyBookings={localBookings.length > 0} />
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <MyBookingCard
              key={booking.id}
              booking={booking}
              onBookingCancelled={handleBookingCancelled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CancelledEmptyState({
  tab,
  hasAnyBookings,
}: {
  tab: BookingFilterTab;
  hasAnyBookings: boolean;
}) {
  if (tab === "cancelled") {
    return (
      <div className="rounded-2xl border border-dashed border-red-100 bg-red-50/30 py-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100/80">
          <XCircle className="h-10 w-10 text-red-400" />
        </div>
        <p className="mt-5 text-gray-700 font-semibold">No cancelled bookings yet.</p>
        <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
          Your cancelled bookings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
      <Car className="mx-auto h-12 w-12 text-gray-300" />
      <p className="mt-4 text-gray-600 font-medium">
        {hasAnyBookings ? "No bookings in this category" : "No bookings found."}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {hasAnyBookings
          ? "Try another filter or book a new ride."
          : "Search vehicles and book your next trip with Rydez India."}
      </p>
      <Button href="/search" variant="primary" className="mt-6">
        <Search className="h-4 w-4 mr-1.5" />
        Search Vehicles
      </Button>
    </div>
  );
}
