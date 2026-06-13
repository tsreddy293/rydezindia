"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Car, Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { registerOwner } from "@/server/actions/registerOwner";
import type { RegisterOwnerInput } from "@/types/database";

const VEHICLE_TYPES = [
  { value: "Hatchback", label: "Hatchback" },
  { value: "Sedan", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MUV", label: "MUV" },
  { value: "Luxury", label: "Luxury" },
  { value: "Tempo Traveller", label: "Tempo Traveller" },
];

export default function OwnerRegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const input: RegisterOwnerInput = {
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      email: String(form.get("email") ?? ""),
      city: String(form.get("city") ?? ""),
      password: String(form.get("password") ?? ""),
      aadhaar_number: String(form.get("aadhaar_number") ?? ""),
      license_number: String(form.get("license_number") ?? ""),
      vehicle_type: String(form.get("vehicle_type") ?? ""),
      vehicle_number: String(form.get("vehicle_number") ?? ""),
    };

    const result = await registerOwner(input);

    if (result.success) {
      router.push("/owner/success");
      router.refresh();
    } else {
      setError(result.error ?? "Registration failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white border border-gray-100 shadow-lg p-6 md:p-8 space-y-6"
      >
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-secondary">Owner Registration</h2>
            <p className="text-sm text-gray-500">All fields marked * are required</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full Name" name="name" required placeholder="Ravi Kumar" />
          <FormField label="Mobile Number (optional)" name="mobile" type="tel" placeholder="9876543210" />
          <FormField label="Email Address" name="email" type="email" required placeholder="you@email.com" />
          <FormField label="City" name="city" required placeholder="Hyderabad" />
          <FormField label="Password" name="password" type="password" required placeholder="Minimum 8 characters" />
          <FormField label="Aadhaar Number" name="aadhaar_number" required placeholder="123456789012" />
          <FormField label="Driving License Number" name="license_number" required placeholder="TS01234567890123" />
          <FormField label="Vehicle Type" name="vehicle_type" as="select" required options={VEHICLE_TYPES} />
          <FormField label="Vehicle Number" name="vehicle_number" required placeholder="TS09 AB 1234" />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Registration"
          )}
        </Button>
      </form>
    </motion.div>
  );
}
