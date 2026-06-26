"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import VehicleServiceAvailabilityFields from "@/components/owner/VehicleServiceAvailabilityFields";
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

const STEPS = [
  "Vehicle Details",
  "Photos",
  "Documents",
  "Pricing",
  "Availability",
  "Preview",
  "Submit",
];

const PHOTO_SLOTS = ["Front", "Rear", "Left", "Right", "Interior", "Dashboard"];

interface Props {
  vehicle?: OwnerVehicleRow;
  disabled?: boolean;
}

export default function VehicleListingWizard({ vehicle, disabled }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isEdit = Boolean(vehicle);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dup = sessionStorage.getItem("owner-duplicate-vehicle");
    if (!dup || isEdit) return;
    try {
      const data = JSON.parse(dup) as Record<string, string | number>;
      const form = document.getElementById("vehicle-wizard-form") as HTMLFormElement | null;
      if (!form) return;
      Object.entries(data).forEach(([key, val]) => {
        const el = form.elements.namedItem(key) as HTMLInputElement | null;
        if (el) el.value = String(val);
      });
      sessionStorage.removeItem("owner-duplicate-vehicle");
    } catch {
      /* ignore */
    }
  }, [isEdit, step]);

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  async function handleSubmit(form: HTMLFormElement) {
    setLoading(true);
    setError("");
    const formData = new FormData(form);
    formData.set("form_action", "submit");
    if (vehicle?.id) formData.set("vehicle_id", vehicle.id);

    const result = await saveOwnerVehicle(formData);
    if (result.success) {
      setSuccessMessage(result.message ?? "Vehicle submitted successfully.");
      setTimeout(() => {
        router.push("/owner/my-vehicles");
        router.refresh();
      }, 2200);
    } else {
      setError(result.error ?? "Failed to save vehicle");
      setLoading(false);
    }
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="space-y-6">
      {isEdit && vehicle && <VehicleStatusBadge status={vehicle.approval_status} />}

      <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-gray-900">
        <div className="mb-2 flex justify-between text-sm font-medium text-gray-600">
          <span>Step {step + 1} of {STEPS.length}: {STEPS[step]}</span>
          <span className="text-primary">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 hidden gap-1 sm:flex">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`flex-1 truncate rounded-lg py-1.5 text-[10px] font-semibold uppercase ${i === step ? "bg-primary/10 text-primary" : i < step ? "text-emerald-600" : "text-gray-400"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        </div>
      )}

      <form
        id="vehicle-wizard-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled || step < STEPS.length - 1) return;
          handleSubmit(e.currentTarget);
        }}
        className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm md:p-8 dark:bg-gray-900"
      >
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        {step === 0 && (
          <section className="grid gap-5 sm:grid-cols-2">
            <FormField label="Vehicle Make" name="vehicle_make" required defaultValue={vehicle?.vehicle_make} placeholder="Toyota" />
            <FormField label="Vehicle Model" name="vehicle_model" required defaultValue={vehicle?.vehicle_model} placeholder="Innova Crysta" />
            <FormField label="Registration Number" name="registration_number" required defaultValue={vehicle?.registration_number} placeholder="TS09AB1234" />
            <FormField label="Vehicle Year" name="vehicle_year" type="number" required defaultValue={vehicle?.vehicle_year?.toString()} placeholder="2022" />
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle Category</span>
              <select name="vehicle_category" required defaultValue={vehicle?.vehicle_category ?? ""} className="w-full rounded-xl border px-4 py-2.5 text-sm">
                <option value="">Select category</option>
                {VEHICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <p className="text-sm text-gray-500">Upload at least one clear exterior photo. Additional angles help approval.</p>
            {PHOTO_SLOTS.map((slot, i) => (
              <div key={slot} className="rounded-xl border border-dashed p-4">
                <p className="mb-2 text-sm font-medium">{slot} {i === 0 && <span className="text-red-500">*</span>}</p>
                {i === 0 && vehicle?.vehicle_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vehicle.vehicle_photo_url} alt="" className="mb-2 h-24 rounded-lg object-cover" />
                )}
                <input
                  type="file"
                  name={i === 0 ? "vehicle_photo" : undefined}
                  accept="image/*"
                  className="w-full text-sm"
                  disabled={i !== 0}
                />
                {i !== 0 && <p className="mt-1 text-xs text-gray-400">Additional angles — upload with primary photo for now</p>}
              </div>
            ))}
          </section>
        )}

        {step === 2 && (
          <section className="grid gap-5 sm:grid-cols-2">
            {[
              { name: "rc", label: "RC Certificate", url: vehicle?.rc_document_url },
              { name: "insurance", label: "Insurance", url: vehicle?.insurance_document_url },
            ].map((doc) => (
              <div key={doc.name} className="rounded-xl border p-4">
                <p className="mb-2 font-medium">{doc.label}</p>
                <input type="file" name={doc.name} accept="image/*,.pdf" className="w-full text-sm" />
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-primary underline">View uploaded</a>
                )}
              </div>
            ))}
            {["Pollution (PUC)", "Permit", "Fitness"].map((label) => (
              <div key={label} className="rounded-xl border border-dashed border-gray-200 p-4 opacity-75">
                <p className="font-medium text-gray-600">{label}</p>
                <p className="mt-1 text-xs text-gray-400">Optional — upload via RC/Insurance or contact support</p>
              </div>
            ))}
          </section>
        )}

        {step === 3 && (
          <section className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Daily Rate (₹)", placeholder: "2500" },
              { label: "Hourly Rate (₹)", placeholder: "350" },
              { label: "Driver Charges (₹)", placeholder: "800" },
              { label: "Extra KM (₹/km)", placeholder: "12" },
              { label: "Security Deposit (₹)", placeholder: "5000" },
              { label: "Cleaning Fee (₹)", placeholder: "500" },
            ].map((f) => (
              <label key={f.label} className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">{f.label}</span>
                <input type="number" placeholder={f.placeholder} className="w-full rounded-xl border px-4 py-2.5 text-sm" readOnly={false} />
                <span className="text-xs text-gray-400">Pricing configured after approval</span>
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Cancellation Rules</span>
              <select className="w-full rounded-xl border px-4 py-2.5 text-sm" defaultValue="flexible">
                <option value="flexible">Flexible — free cancel 24h before</option>
                <option value="moderate">Moderate — 50% within 24h</option>
                <option value="strict">Strict — no refund within 48h</option>
              </select>
            </label>
          </section>
        )}

        {step === 4 && (
          <VehicleServiceAvailabilityFields
            services={{
              service_self_drive: vehicle?.service_self_drive,
              service_with_driver: vehicle?.service_with_driver,
              service_local_rental: vehicle?.service_local_rental,
              service_return_journey: vehicle?.service_return_journey,
            }}
            disabled={disabled}
          />
        )}

        {step === 5 && (
          <section className="space-y-4 rounded-xl bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="font-bold text-secondary">Preview</h3>
            <p className="text-sm text-gray-600">Review your vehicle details before submitting for admin approval.</p>
            <ul className="space-y-2 text-sm">
              <li>✓ Vehicle details captured</li>
              <li>✓ Photo & documents ready for upload</li>
              <li>✓ Service availability configured</li>
              <li>✓ Pricing preferences noted for post-approval setup</li>
            </ul>
          </section>
        )}

        {step === 6 && (
          <section className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-xl font-bold">Ready to Submit</h3>
            <p className="mt-2 text-sm text-gray-500">Your vehicle will be reviewed by our team within 24–48 hours.</p>
          </section>
        )}

        <div className="flex flex-wrap justify-between gap-3 border-t pt-6">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || loading}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={next} disabled={disabled}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={loading || Boolean(successMessage) || disabled}>
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</> : "Submit for Approval"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
