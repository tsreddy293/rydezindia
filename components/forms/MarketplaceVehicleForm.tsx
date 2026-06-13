"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import FormField from "@/components/forms/FormField";
import {
  registerDriverVehicle,
  registerSelfDriveVehicle,
} from "@/server/actions/registerMarketplaceVehicle";
import type { VehicleOwner } from "@/types/database";

const VEHICLE_TYPES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Luxury",
  "Tempo Traveller",
  "Mini Bus",
  "Bus",
].map((value) => ({ value, label: value }));

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((value) => ({
  value,
  label: value,
}));

const TRANSMISSIONS = ["Manual", "Automatic"].map((value) => ({ value, label: value }));

interface Props {
  owners: VehicleOwner[];
  mode: "self_drive" | "with_driver";
}

export default function MarketplaceVehicleForm({ owners, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isSelfDrive = mode === "self_drive";
  const title = isSelfDrive ? "Self Drive Vehicle Registered!" : "Driver Vehicle Registered!";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const photos = String(form.get("photos") ?? "")
      .split("\n")
      .map((photo) => photo.trim())
      .filter(Boolean);

    const common = {
      owner_id: String(form.get("owner_id") ?? ""),
      vehicle_name: String(form.get("vehicle_name") ?? ""),
      vehicle_type: String(form.get("vehicle_type") ?? ""),
      vehicle_number: String(form.get("vehicle_number") ?? ""),
      fuel_type: String(form.get("fuel_type") ?? ""),
      transmission: String(form.get("transmission") ?? ""),
      seats: Number(form.get("seats") ?? 0),
      pickup_city: String(form.get("pickup_city") ?? ""),
      drop_city: String(form.get("drop_city") ?? ""),
      journey_date: String(form.get("journey_date") ?? ""),
      journey_time: String(form.get("journey_time") ?? ""),
      available_seats: Number(form.get("available_seats") ?? form.get("seats") ?? 0),
      price: Number(form.get("price") ?? 0),
    };

    const result = isSelfDrive
      ? await registerSelfDriveVehicle({
          ...common,
          location: String(form.get("location") ?? ""),
          daily_rent: Number(form.get("daily_rent") ?? 0),
          security_deposit: Number(form.get("security_deposit") ?? 0),
          photos,
        })
      : await registerDriverVehicle({
          ...common,
          driver_name: String(form.get("driver_name") ?? ""),
          driver_phone: String(form.get("driver_phone") ?? ""),
          rate_per_km: Number(form.get("rate_per_km") ?? 0),
          base_location: String(form.get("base_location") ?? ""),
          local_package_price: Number(form.get("local_package_price") ?? 0),
          outstation_package_price: Number(form.get("outstation_package_price") ?? 0),
          airport_transfer_price: Number(form.get("airport_transfer_price") ?? 0),
        });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.push(isSelfDrive ? "/search-self-drive" : "/search-driver"), 1200);
    } else {
      setError(result.error ?? "Failed to register vehicle");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white border p-10 text-center shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-secondary mb-2">{title}</h2>
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
        options={owners.map((owner) => ({
          value: owner.id,
          label: `${owner.name}${owner.city ? ` - ${owner.city}` : ""}`,
        }))}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Vehicle Name" name="vehicle_name" required placeholder="Toyota Innova Crysta" />
        <FormField label="Vehicle Number" name="vehicle_number" required placeholder="TS09 AB 1234" />
        <FormField label="Vehicle Type" name="vehicle_type" as="select" required options={VEHICLE_TYPES} />
        <FormField label="Seats" name="seats" type="number" required placeholder="7" />
        <FormField label="Fuel Type" name="fuel_type" as="select" options={FUEL_TYPES} />
        <FormField label="Transmission" name="transmission" as="select" options={TRANSMISSIONS} />
        <FormField label="Pickup City" name="pickup_city" required placeholder="Hyderabad" />
        <FormField label="Drop City" name="drop_city" placeholder={isSelfDrive ? "Optional" : "Vijayawada"} />
        <FormField label="Journey Date" name="journey_date" type="date" />
        <FormField label="Journey Time" name="journey_time" type="time" />
        <FormField label="Available Seats" name="available_seats" type="number" required placeholder="4" />
      </div>

      {isSelfDrive ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="City / Location" name="location" required placeholder="Hyderabad" />
          <FormField label="Price / Day" name="price" type="number" required placeholder="2499" />
          <FormField label="Daily Rent" name="daily_rent" type="number" required placeholder="2499" />
          <FormField label="Security Deposit" name="security_deposit" type="number" required placeholder="5000" />
          <FormField
            label="Photo URLs"
            name="photos"
            as="textarea"
            placeholder="Add one photo URL per line"
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Driver Name" name="driver_name" required placeholder="Ramesh Kumar" />
          <FormField label="Driver Phone" name="driver_phone" type="tel" required placeholder="9876543210" />
          <FormField label="Base Location" name="base_location" required placeholder="Hyderabad" />
          <FormField label="Full Vehicle Price" name="price" type="number" required placeholder="4500" />
          <FormField label="Rate Per KM" name="rate_per_km" type="number" required placeholder="18" />
          <FormField label="Local Package Price" name="local_package_price" type="number" placeholder="2500" />
          <FormField label="Outstation Package Price" name="outstation_package_price" type="number" placeholder="6500" />
          <FormField label="Airport Transfer Price" name="airport_transfer_price" type="number" placeholder="1200" />
        </div>
      )}

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
