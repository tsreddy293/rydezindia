"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DashboardBookingRow } from "@/lib/admin/dashboard-types";
import { filterBookingsByStatus } from "@/lib/admin/dashboard-types";
import { formatINR } from "@/lib/utils";

const BOOKING_FILTERS = [
  "All",
  "Pending",
  "Approved",
  "Active",
  "Completed",
  "Cancelled",
  "Refunded",
] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

function badgeClass(status: string): string {
  return STATUS_BADGE[status.toLowerCase()] ?? "bg-gray-100 text-gray-700";
}

export default function BookingManagementSection({
  bookings,
}: {
  bookings: DashboardBookingRow[];
}) {
  const [filter, setFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (filter === "All") return bookings;
    return filterBookingsByStatus(bookings, filter.toLowerCase());
  }, [bookings, filter]);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-secondary">Booking Management</h2>
          <p className="text-sm text-gray-500">Filter and review bookings</p>
        </div>
        <Link
          href="/admin/bookings"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Full Booking List
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {BOOKING_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-secondary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-3 font-semibold">Booking ID</th>
              <th className="pb-3 pr-3 font-semibold">Passenger</th>
              <th className="pb-3 pr-3 font-semibold">Vehicle</th>
              <th className="pb-3 pr-3 font-semibold">Owner</th>
              <th className="pb-3 pr-3 font-semibold">Payment</th>
              <th className="pb-3 pr-3 font-semibold">Booking</th>
              <th className="pb-3 pr-3 font-semibold">Trip</th>
              <th className="pb-3 pr-3 font-semibold">Amount</th>
              <th className="pb-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  No bookings match this filter.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 15).map((b) => (
                <tr key={b.id}>
                  <td className="py-3 pr-3 font-mono text-xs">{b.bookingReference}</td>
                  <td className="py-3 pr-3">{b.passenger}</td>
                  <td className="py-3 pr-3 text-gray-600">{b.vehicle}</td>
                  <td className="py-3 pr-3 text-gray-600">{b.owner}</td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(b.paymentStatus)}`}>
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass(b.bookingStatus)}`}>
                      {b.bookingStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-gray-600">{b.tripStatus}</td>
                  <td className="py-3 pr-3 font-semibold">{formatINR(b.amount)}</td>
                  <td className="py-3">
                    <Link
                      href="/admin/bookings"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
