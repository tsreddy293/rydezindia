"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import VehicleOnboardingSteps from "@/components/owner/VehicleOnboardingSteps";
import VehicleStatusBadge from "@/components/owner/VehicleStatusBadge";
import { saveOwnerVehicle } from "@/server/actions/vehicles";
import type { OwnerVehicleRow } from "@/lib/vehicles/format";

const VEHICLE_CATEGORIES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "Luxury",
  "Van",
  "Tempo Traveller",
  "Mini Bus",
];

interface Props {
  vehicle?: OwnerVehicleRow;
  disabled?: boolean;
}

export default function VehicleListingForm({ vehicle, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isEdit = Boolean(vehicle);

  async function handleSubmit(form: HTMLFormElement) {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    const formData = new FormData(form);
    formData.set("form_action", "submit");
    if (vehicle?.id) formData.set("vehicle_id", vehicle.id);

    const result = await saveOwnerVehicle(formData);
    if (result.success) {
      setSuccessMessage(
        result.message ?? "Vehicle submitted successfully. Waiting for admin approval."
      );
      setTimeout(() => {
        router.push("/owner/my-vehicles");
        router.refresh();
      }, 2200);
    } else {
      setError(result.error ?? "Failed to save vehicle");
      setLoading(false);
    }
  }

  return (
    <div>
      <VehicleOnboardingSteps currentStep={isEdit ? 3 : 1} />

      {isEdit && vehicle && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <VehicleStatusBadge status={vehicle.approval_status} />
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold">Vehicle submitted successfully.</p>
              <p className="mt-1">Waiting for admin approval.</p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          handleSubmit(e.currentTarget);
        }}
        className="space-y-8 rounded-2xl bg-white border shadow-sm p-6 md:p-8"
      >
        <div>
          <h2 className="text-xl font-bold text-secondary">
            {isEdit ? "Edit Vehicle" : "Add New Vehicle"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Add as many vehicles as you like. Each vehicle is reviewed and approved separately by our admin team.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <section className="space-y-5">
          <h3 className="font-semibold text-secondary border-b pb-2">Vehicle Details</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Vehicle Make" name="vehicle_make" required defaultValue={vehicle?.vehicle_make} placeholder="Toyota" />
            <FormField label="Vehicle Model" name="vehicle_model" required defaultValue={vehicle?.vehicle_model} placeholder="Innova Crysta" />
            <FormField label="Registration Number" name="registration_number" required defaultValue={vehicle?.registration_number} placeholder="TS09AB1234" />
            <FormField label="Vehicle Year" name="vehicle_year" type="number" required defaultValue={vehicle?.vehicle_year?.toString()} placeholder="2022" />
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle Category</span>
              <select
                name="vehicle_category"
                required
                defaultValue={vehicle?.vehicle_category ?? ""}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select category</option>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <h3 className="font-semibold text-secondary">Vehicle Photo</h3>
          {vehicle?.vehicle_photo_url && (
            <img src={vehicle.vehicle_photo_url} alt="Vehicle" className="h-32 w-44 rounded-lg object-cover border" />
          )}
          <input
            type="file"
            name="vehicle_photo"
            accept="image/*"
            className="w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <p className="text-xs text-gray-400">Upload a clear exterior photo (required for submission)</p>
        </section>

        <section className="space-y-5 border-t pt-6">
          <h3 className="font-semibold text-secondary">Documents</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">RC Upload</label>
              <input type="file" name="rc" accept="image/*,.pdf" className="w-full text-sm" />
              {vehicle?.rc_document_url && (
                <a href={vehicle.rc_document_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                  View uploaded RC
                </a>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Insurance Upload</label>
              <input type="file" name="insurance" accept="image/*,.pdf" className="w-full text-sm" />
              {vehicle?.insurance_document_url && (
                <a href={vehicle.insurance_document_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                  View uploaded insurance
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button type="submit" variant="primary" disabled={loading || Boolean(successMessage) || disabled}>
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : "Submit for Approval"}
          </Button>
          <Button href="/owner/my-vehicles" variant="ghost" type="button">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
