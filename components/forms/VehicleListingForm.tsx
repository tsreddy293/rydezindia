"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import VehicleOnboardingSteps from "@/components/owner/VehicleOnboardingSteps";
import VehicleStatusBadge from "@/components/owner/VehicleStatusBadge";
import { saveOwnerVehicle } from "@/server/actions/vehicles";

const VEHICLE_CATEGORIES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "Luxury",
  "Van",
  "Tempo Traveller",
  "Mini Bus",
];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "EV"];
const TRANSMISSIONS = ["Manual", "Automatic"];

interface ExistingVehicle {
  id: string;
  vehicle_name: string;
  vehicle_number: string;
  vehicle_type: string;
  fuel_type?: string | null;
  transmission?: string | null;
  seats: number;
  has_ac?: boolean;
  rate_per_km?: number | null;
  base_location?: string | null;
  vehicle_approval_status?: string;
  rejection_reason?: string | null;
  reupload_requested?: boolean;
  reupload_reason?: string | null;
  images?: string[];
  documents?: Record<string, string | null>;
}

interface Props {
  vehicle?: ExistingVehicle;
}

export default function VehicleListingForm({ vehicle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState("");
  const isEdit = Boolean(vehicle);
  const status = String(vehicle?.vehicle_approval_status ?? "draft");

  async function handleSave(action: "draft" | "submit", form: HTMLFormElement) {
    setLoading(action);
    setError("");
    const formData = new FormData(form);
    formData.set("form_action", action);
    if (vehicle?.id) formData.set("vehicle_id", vehicle.id);

    const result = await saveOwnerVehicle(formData);
    if (result.success) {
      router.push("/owner/my-vehicles");
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save vehicle");
      setLoading(null);
    }
  }

  return (
    <div>
      <VehicleOnboardingSteps currentStep={isEdit ? 3 : 1} />

      {isEdit && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <VehicleStatusBadge
            status={status}
            reuploadRequested={Boolean(vehicle?.reupload_requested)}
          />
          {vehicle?.rejection_reason && (
            <p className="text-sm text-red-600">Admin note: {vehicle.rejection_reason}</p>
          )}
          {vehicle?.reupload_reason && (
            <p className="text-sm text-amber-700">Re-upload: {vehicle.reupload_reason}</p>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave("submit", e.currentTarget);
        }}
        className="space-y-8 rounded-2xl bg-white border shadow-sm p-6 md:p-8"
      >
        <div>
          <h2 className="text-xl font-bold text-secondary">
            {isEdit ? "Edit Vehicle" : "Add New Vehicle"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Save as draft anytime, or submit for admin approval when all details and documents are ready.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <section className="space-y-5">
          <h3 className="font-semibold text-secondary border-b pb-2">Vehicle Details</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Vehicle Name" name="vehicle_name" required defaultValue={vehicle?.vehicle_name} placeholder="Toyota Innova Crysta" />
            <FormField label="Vehicle Number" name="vehicle_number" required defaultValue={vehicle?.vehicle_number} placeholder="TS09AB1234" />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Category</span>
              <select name="vehicle_category" required defaultValue={vehicle?.vehicle_type ?? ""} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Select category</option>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Fuel Type</span>
              <select name="fuel_type" required defaultValue={vehicle?.fuel_type ?? ""} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Select fuel type</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Transmission</span>
              <select name="transmission" required defaultValue={vehicle?.transmission ?? ""} className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="">Select transmission</option>
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <FormField label="Seats" name="seating_capacity" type="number" required defaultValue={vehicle?.seats?.toString()} placeholder="7" />
            <FormField label="Price Per KM (₹)" name="rate_per_km" type="number" required defaultValue={vehicle?.rate_per_km?.toString()} placeholder="15" />
            <FormField label="Base City / Location" name="base_location" required defaultValue={vehicle?.base_location ?? ""} placeholder="Hyderabad" />
            <label className="flex items-center gap-3 sm:col-span-2">
              <input type="checkbox" name="has_ac" defaultChecked={vehicle?.has_ac !== false} className="h-4 w-4 rounded border-gray-300 text-primary" />
              <span className="text-sm font-medium text-gray-700">Air Conditioned (AC)</span>
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h3 className="font-semibold text-secondary">Vehicle Photos</h3>
          {vehicle?.images && vehicle.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vehicle.images.map((url) => (
                <img key={url} src={url} alt="Vehicle" className="h-24 w-32 rounded-lg object-cover border" />
              ))}
            </div>
          )}
          <input type="file" name="vehicle_images" accept="image/*" multiple className="w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
          <p className="text-xs text-gray-400">Upload clear exterior and interior photos (required before submit)</p>
        </section>

        <section className="space-y-5 border-t pt-6">
          <h3 className="font-semibold text-secondary">Documents</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["rc", "RC Book", "rc_expiry"],
                ["insurance", "Insurance", "insurance_expiry"],
                ["pollution", "Pollution Certificate", "pollution_expiry"],
              ] as const
            ).map(([name, label, expiryName]) => (
              <div key={name} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input type="file" name={name} accept="image/*,.pdf" className="w-full text-sm" />
                <FormField label="Expiry Date" name={expiryName} type="date" />
                {vehicle?.documents?.[name] && (
                  <a href={vehicle.documents[name]!} target="_blank" rel="noopener" className="text-xs text-primary underline">View uploaded file</a>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button type="submit" variant="primary" disabled={loading !== null}>
            {loading === "submit" ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : "Submit for Approval"}
          </Button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (form) handleSave("draft", form);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-6 py-3 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            {loading === "draft" ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : "Save Draft"}
          </button>
          <Button href="/owner/my-vehicles" variant="ghost" type="button">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
