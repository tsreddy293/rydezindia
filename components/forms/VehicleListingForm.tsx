"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { createOwnerVehicle, updateOwnerVehicle } from "@/server/actions/vehicles";

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
  images?: string[];
  documents?: Record<string, string | null>;
}

interface Props {
  vehicle?: ExistingVehicle;
}

export default function VehicleListingForm({ vehicle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(vehicle);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = isEdit
      ? await updateOwnerVehicle(vehicle!.id, formData)
      : await createOwnerVehicle(formData);

    if (result.success) {
      router.push("/owner/vehicles");
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save vehicle");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white border shadow-sm p-6 md:p-8">
      <div>
        <h2 className="text-xl font-bold text-secondary">
          {isEdit ? "Edit Vehicle" : "Add New Vehicle"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Submit for admin approval. All documents are required for verification.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Vehicle Name"
          name="vehicle_name"
          required
          defaultValue={vehicle?.vehicle_name}
          placeholder="e.g. Toyota Innova Crysta"
        />
        <FormField
          label="Vehicle Number"
          name="vehicle_number"
          required
          defaultValue={vehicle?.vehicle_number}
          placeholder="e.g. TS09AB1234"
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle Category</span>
          <select
            name="vehicle_category"
            required
            defaultValue={vehicle?.vehicle_type ?? ""}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select category</option>
            {VEHICLE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Fuel Type</span>
          <select
            name="fuel_type"
            required
            defaultValue={vehicle?.fuel_type ?? ""}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select fuel type</option>
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Transmission</span>
          <select
            name="transmission"
            required
            defaultValue={vehicle?.transmission ?? ""}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select transmission</option>
            {TRANSMISSIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <FormField
          label="Seating Capacity"
          name="seating_capacity"
          type="number"
          required
          defaultValue={vehicle?.seats?.toString()}
          placeholder="e.g. 7"
        />
        <label className="flex items-center gap-3 sm:col-span-2">
          <input
            type="checkbox"
            name="has_ac"
            defaultChecked={vehicle?.has_ac !== false}
            className="h-4 w-4 rounded border-gray-300 text-primary"
          />
          <span className="text-sm font-medium text-gray-700">Air Conditioned (AC)</span>
        </label>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-secondary mb-4">Vehicle Images</h3>
        {vehicle?.images && vehicle.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {vehicle.images.map((url) => (
              <img key={url} src={url} alt="Vehicle" className="h-20 w-28 rounded-lg object-cover border" />
            ))}
          </div>
        )}
        <input
          type="file"
          name="vehicle_images"
          accept="image/*"
          multiple
          className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary/90"
        />
        <p className="mt-1 text-xs text-gray-400">Upload multiple photos (JPG, PNG)</p>
      </div>

      <div className="border-t pt-6 grid gap-5 sm:grid-cols-2">
        <h3 className="font-semibold text-secondary sm:col-span-2">Documents</h3>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">RC Upload</span>
          <input type="file" name="rc" accept="image/*,.pdf" className="w-full text-sm" />
          {vehicle?.documents?.rc && (
            <a href={vehicle.documents.rc} target="_blank" rel="noopener" className="text-xs text-primary mt-1 inline-block">View current</a>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Insurance Upload</span>
          <input type="file" name="insurance" accept="image/*,.pdf" className="w-full text-sm" />
          {vehicle?.documents?.insurance && (
            <a href={vehicle.documents.insurance} target="_blank" rel="noopener" className="text-xs text-primary mt-1 inline-block">View current</a>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Pollution Certificate</span>
          <input type="file" name="pollution" accept="image/*,.pdf" className="w-full text-sm" />
          {vehicle?.documents?.pollution && (
            <a href={vehicle.documents.pollution} target="_blank" rel="noopener" className="text-xs text-primary mt-1 inline-block">View current</a>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Fitness Certificate</span>
          <input type="file" name="fitness" accept="image/*,.pdf" className="w-full text-sm" />
          {vehicle?.documents?.fitness && (
            <a href={vehicle.documents.fitness} target="_blank" rel="noopener" className="text-xs text-primary mt-1 inline-block">View current</a>
          )}
        </label>
      </div>

      <div className="flex flex-wrap gap-3 pt-4">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Vehicle"
          ) : (
            "Submit for Approval"
          )}
        </Button>
        <Button href="/owner/vehicles" variant="outline" type="button">
          Cancel
        </Button>
      </div>
    </form>
  );
}
