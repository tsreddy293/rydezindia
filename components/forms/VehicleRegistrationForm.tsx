"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { registerVehicle } from "@/server/actions/registerVehicle";
import type { VehicleOwner } from "@/types/database";

const VEHICLE_TYPES = [
  { value: "Hatchback", label: "Hatchback" },
  { value: "Sedan", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MUV", label: "MUV" },
  { value: "Luxury", label: "Luxury" },
  { value: "Tempo Traveller", label: "Tempo Traveller" },
];

interface Props {
  owners: VehicleOwner[];
}

export default function VehicleRegistrationForm({ owners }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    const result = await registerVehicle({
      owner_id: String(form.get("owner_id") ?? ""),
      vehicle_type: String(form.get("vehicle_type") ?? ""),
      vehicle_number: String(form.get("vehicle_number") ?? ""),
      seats: Number(form.get("seats") ?? 0),
      from_city: String(form.get("from_city") ?? ""),
      to_city: String(form.get("to_city") ?? ""),
      price: Number(form.get("price") ?? 0),
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push("/search"), 1500);
    } else {
      setError(result.error ?? "Failed to register vehicle");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white border p-10 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-secondary mb-2">Vehicle Registered!</h2>
        <p className="text-gray-600">Redirecting to search...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border shadow-lg p-6 md:p-8 space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <FormField
        label="Owner"
        name="owner_id"
        as="select"
        required
        options={owners.map((o) => ({
          value: o.id,
          label: `${o.name}${o.city ? ` — ${o.city}` : ""}${o.vehicle_number ? ` (${o.vehicle_number})` : ""}`,
        }))}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Vehicle Type" name="vehicle_type" as="select" required options={VEHICLE_TYPES} />
        <FormField label="Vehicle Number" name="vehicle_number" required placeholder="TS09 AB 1234" />
        <FormField label="Seats" name="seats" type="number" required placeholder="7" />
        <FormField label="Price (₹ per seat)" name="price" type="number" required placeholder="1200" />
        <FormField label="From City" name="from_city" required placeholder="Hyderabad" />
        <FormField label="To City" name="to_city" required placeholder="Bangalore" />
      </div>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Registering...
          </>
        ) : (
          "Register Vehicle"
        )}
      </Button>
    </form>
  );
}
