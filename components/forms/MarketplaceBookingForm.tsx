"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MapPin, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import { createMarketplaceBooking } from "@/server/actions/createBooking";
import { formatINR } from "@/lib/utils";
import type { DriverVehicleResult, SelfDriveResult } from "@/types/database";

type Props =
  | { type: "self_drive"; listing: SelfDriveResult }
  | { type: "with_driver"; listing: DriverVehicleResult };

export default function MarketplaceBookingForm({ type, listing }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const isSelfDrive = type === "self_drive";
  const amount = isSelfDrive
    ? (listing.price || (listing as SelfDriveResult).daily_rent) + (listing as SelfDriveResult).security_deposit
    : listing.price || (listing as DriverVehicleResult).rate_per_km;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const result = await createMarketplaceBooking({
      booking_type: type,
      reference_id: listing.id,
      vehicle_id: listing.vehicle_id,
      passenger_name: String(form.get("passenger_name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      amount,
    });

    if (result.success) {
      setBookingId(result.data?.id ?? "");
      setSuccess(true);
    } else {
      setError(result.error ?? "Booking failed");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white border p-10 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-secondary mb-2">Booking Request Submitted!</h2>
        <p className="text-gray-600 mb-6">Our team will confirm availability and payment shortly.</p>
        <Button href={bookingId ? `/booking/confirmation/${bookingId}` : isSelfDrive ? "/search-self-drive" : "/search-driver"} variant="primary">
          {bookingId ? "View Confirmation" : "Back to Search"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl bg-secondary text-white p-6 space-y-4 h-fit">
        <h2 className="text-xl font-bold">{listing.vehicle_name}</h2>
        <p className="text-white/70 text-sm">{listing.vehicle_type}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {listing.drop_city ? `${listing.pickup_city} → ${listing.drop_city}` : listing.pickup_city}
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Owner: {listing.owner_name}
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <p className="text-white/70 text-sm">{isSelfDrive ? "Estimated first-day rental" : "Full vehicle booking"}</p>
          <p className="text-2xl font-bold text-accent">{formatINR(amount)}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5"
      >
        <h2 className="text-xl font-bold text-secondary">Booking Details</h2>
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <FormField label="Passenger Name" name="passenger_name" required placeholder="Your full name" />
        <FormField label="Mobile Number" name="mobile" type="tel" required placeholder="9876543210" />
        {isSelfDrive ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Pickup Date" name="pickup_date" type="date" required />
            <FormField label="Return Date" name="return_date" type="date" required />
          </div>
        ) : (
          <FormField label="Trip Notes" name="trip_notes" as="textarea" placeholder="Local, outstation, or airport transfer details" />
        )}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Booking...
            </>
          ) : (
            "Submit Booking Request"
          )}
        </Button>
      </form>
    </div>
  );
}
