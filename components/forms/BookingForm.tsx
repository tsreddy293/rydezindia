"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, MapPin, Calendar, Users } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { createBooking } from "@/server/actions/createBooking";
import { formatDate, formatINR } from "@/lib/utils";

interface JourneyInfo {
  id: string;
  from_city: string;
  to_city: string;
  journey_date: string;
  available_seats: number;
  price_per_seat: number;
  vehicle: { vehicle_name: string; vehicle_type: string } | null;
  owner: { name: string } | null;
}

interface Props {
  journey: JourneyInfo;
}

export default function BookingForm({ journey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const seats = Number(form.get("seats_booked") ?? 0);

    const result = await createBooking({
      ride_id: journey.id,
      passenger_name: String(form.get("passenger_name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      seats_booked: seats,
    });

    if (result.success) {
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
        <h2 className="text-2xl font-bold text-secondary mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 mb-6">
          Your booking for {journey.vehicle?.vehicle_name} has been submitted.
        </p>
        <Button href="/search" variant="primary">
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2 rounded-2xl bg-secondary text-white p-6 space-y-4 h-fit">
        <h2 className="text-xl font-bold">{journey.vehicle?.vehicle_name ?? "Vehicle"}</h2>
        <p className="text-white/70 text-sm">{journey.vehicle?.vehicle_type}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            {journey.from_city} → {journey.to_city}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            {formatDate(journey.journey_date)}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            {journey.available_seats} seats available
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <p className="text-white/70 text-sm">Price per seat</p>
          <p className="text-2xl font-bold text-accent">{formatINR(journey.price_per_seat)}</p>
        </div>
        {journey.owner && (
          <p className="text-sm text-white/60">Owner: {journey.owner.name}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="lg:col-span-3 rounded-2xl bg-white border shadow-sm p-6 md:p-8 space-y-5"
      >
        <h2 className="text-xl font-bold text-secondary">Passenger Details</h2>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <FormField label="Passenger Name" name="passenger_name" required placeholder="Your full name" />
        <FormField label="Mobile Number" name="mobile" type="tel" required placeholder="9876543210" />
        <FormField
          label="Seats Required"
          name="seats_booked"
          type="number"
          required
          placeholder={`Max ${journey.available_seats}`}
        />

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </form>
    </div>
  );
}
