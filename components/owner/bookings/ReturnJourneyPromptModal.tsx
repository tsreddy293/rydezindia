"use client";

import { useState } from "react";
import Link from "next/link";
import { Route, X } from "lucide-react";
import ReturnJourneyListingForm from "@/components/forms/ReturnJourneyListingForm";
import type { OwnerBookingRow } from "@/lib/owner/booking-utils";

interface Props {
  booking: OwnerBookingRow;
  vehicles: Array<{ id: string; vehicle_name: string; vehicle_type: string }>;
  onClose: () => void;
}

export default function ReturnJourneyPromptModal({ booking, vehicles, onClose }: Props) {
  const [showForm, setShowForm] = useState(false);

  const fromCity = booking.pickupLocation?.split(",")[0]?.trim() ?? "";
  const toCity = booking.dropLocation?.split(",")[0]?.trim() ?? "";
  const journeyDate = booking.pickupDate ?? new Date().toISOString().slice(0, 10);

  if (!showForm) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-3">
              <Route className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary dark:text-white">Create Return Journey?</h3>
              <p className="text-sm text-gray-500">Trip {booking.bookingReference} completed</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Offer discounted return seats on your route. We&apos;ll pre-fill route details from this trip.
          </p>
          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
            <p><strong>From:</strong> {toCity || "—"}</p>
            <p><strong>To:</strong> {fromCity || "—"}</p>
            <p><strong>Date:</strong> {journeyDate}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex-1 rounded-xl bg-gradient-to-r from-secondary to-primary py-2.5 text-sm font-semibold text-white"
            >
              Yes, Create Listing
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-2.5 text-sm font-medium">
              No, Thanks
            </button>
          </div>
          <Link href="/owner/return-journeys" className="mt-3 block text-center text-xs text-primary hover:underline">
            Go to Return Journey marketplace →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto p-4">
      <button type="button" className="fixed inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <div className="relative mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-4 text-lg font-bold">Return Journey Listing</h3>
        <p className="mb-4 text-sm text-gray-500">Enter discount %, seats, and price. Route pre-filled from completed trip.</p>
        <ReturnJourneyListingForm vehicles={vehicles} />
      </div>
    </div>
  );
}
