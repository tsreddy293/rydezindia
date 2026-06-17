"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { createReturnJourneyListing } from "@/server/actions/vehicles";

interface Props {
  vehicles: { id: string; vehicle_name: string; vehicle_type: string }[];
}

export default function ReturnJourneyListingForm({ vehicles }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await createReturnJourneyListing(new FormData(e.currentTarget));
    if (result.success) {
      setMessage("Return journey listing created! Pending admin approval.");
      e.currentTarget.reset();
    } else {
      setError(result.error ?? "Failed to create listing");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
      <h2 className="text-lg font-bold text-secondary mb-4">Create Return Journey Listing</h2>
      {message && <p className="text-green-700 text-sm mb-4">{message}</p>}
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2 block">
          <span className="mb-1 block text-sm font-medium">Vehicle</span>
          <select name="vehicle_id" required className="w-full rounded-xl border px-4 py-2.5 text-sm">
            <option value="">Select vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.vehicle_name} ({v.vehicle_type})</option>
            ))}
          </select>
        </label>
        <FormField label="Outbound: From" name="from_city" required placeholder="Hyderabad" />
        <FormField label="Outbound: To" name="to_city" required placeholder="Vijayawada" />
        <FormField label="Return: From" name="return_from_city" placeholder="Vijayawada (defaults to To)" />
        <FormField label="Return: To" name="return_to_city" placeholder="Hyderabad (defaults to From)" />
        <FormField label="Journey Date" name="journey_date" type="date" required />
        <FormField label="Outbound Time" name="journey_time" type="time" />
        <FormField label="Return Departure Time" name="return_departure_time" type="time" />
        <FormField label="Available Seats" name="available_seats" type="number" required defaultValue="4" />
        <FormField label="Price per Seat (₹)" name="price" type="number" required />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Discount %</span>
          <select name="discount_percent" defaultValue="30" className="w-full rounded-xl border px-4 py-2.5 text-sm">
            {[20, 25, 30, 35, 40].map((d) => (
              <option key={d} value={d}>{d}%</option>
            ))}
          </select>
        </label>
        <FormField label="Driver Name" name="driver_name" />
        <FormField label="Driver Phone" name="driver_phone" type="tel" />
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Return Journey Deal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
