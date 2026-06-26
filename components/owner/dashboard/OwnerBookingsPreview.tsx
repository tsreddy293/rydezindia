"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OwnerDashboardBooking } from "@/lib/owner/dashboard-types";
import { filterOwnerBookings } from "@/lib/owner/dashboard-types";
import { OWNER_STATUS_STYLES, resolveBookingStatusKind } from "@/lib/owner/owner-status-styles";
import { formatDate, formatINR } from "@/lib/utils";

const FILTERS = ["All", "Pending", "Confirmed", "Ongoing", "Completed", "Cancelled", "Payment Pending"] as const;

export default function OwnerBookingsPreview({ bookings }: { bookings: OwnerDashboardBooking[] }) {
  const [filter, setFilter] = useState<string>("All");
  const filtered = useMemo(() => {
    if (filter === "All") return bookings;
    if (filter === "Ongoing") return filterOwnerBookings(bookings, "ongoing");
    if (filter === "Payment Pending") return filterOwnerBookings(bookings, "payment_pending");
    return filterOwnerBookings(bookings, filter.toLowerCase());
  }, [bookings, filter]);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-secondary">Bookings</h2>
        <Link href="/owner/bookings" className="text-sm font-medium text-primary">Full list →</Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-secondary text-white" : "bg-gray-100 text-gray-600"}`}>
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500">No bookings in this category.</p>
      ) : (
        <ul className="divide-y">
          {filtered.slice(0, 8).map((b) => {
            const kind = resolveBookingStatusKind(b.bookingStatus, b.paymentStatus);
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{b.bookingReference}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>{kind}</span>
                  </div>
                  <p className="text-sm text-gray-600">{b.passengerName} · {b.bookingType}</p>
                  <p className="text-xs text-gray-400">{formatDate(b.createdAt)}</p>
                </div>
                <p className="font-bold text-primary">{formatINR(b.amount)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
