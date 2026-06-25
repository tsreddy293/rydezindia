"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  bookingId: string;
  referenceId?: string;
  bookingType: string;
  bookingStatus: string;
  protectionSelected?: boolean;
}

export default function RescheduleBookingButton({
  referenceId,
  bookingType,
  bookingStatus,
  protectionSelected,
}: Props) {
  const [open, setOpen] = useState(false);
  const status = bookingStatus.toLowerCase();
  const canReschedule = status === "confirmed" || status === "pending";

  if (!canReschedule) return null;

  const bookingHref = referenceId ? `/booking/${referenceId}` : "/search";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-gray-200"
      >
        <CalendarClock className="h-4 w-4 mr-1.5" />
        Reschedule
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-[fadeUp_0.25s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="reschedule-title" className="text-lg font-bold text-secondary">
                    Reschedule Booking
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Update your pickup and return schedule for this trip.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {protectionSelected && (
              <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Flexible Protection includes one free reschedule. Our team will assist you with date changes.
              </p>
            )}

            <p className="mt-4 text-sm text-gray-600">
              {bookingType === "self_drive"
                ? "Choose new dates on the vehicle booking page, or contact support for assisted rescheduling."
                : "Contact our support team or rebook with updated journey details."}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button variant="outline" href="/contact">
                Contact Support
              </Button>
              <Button variant="primary" href={bookingHref}>
                Choose New Dates
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
