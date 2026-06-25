"use client";

import { useMemo, useState } from "react";
import QuickFilters, { type DateRangeId } from "@/components/admin/dashboard/QuickFilters";
import { filterDashboardByDateRange } from "@/lib/admin/dashboard-types";
import type { DashboardBookingRow } from "@/lib/admin/dashboard-types";
import BookingManagementSection from "@/components/admin/dashboard/BookingManagementSection";

export default function DashboardBookingsWithFilters({
  bookings,
}: {
  bookings: DashboardBookingRow[];
}) {
  const [range, setRange] = useState<DateRangeId>("month");

  const filteredBookings = useMemo(
    () => filterDashboardByDateRange(bookings, range, "createdAt"),
    [bookings, range]
  );

  return (
    <div className="space-y-4">
      <QuickFilters value={range} onChange={setRange} />
      <BookingManagementSection bookings={filteredBookings} />
    </div>
  );
}
