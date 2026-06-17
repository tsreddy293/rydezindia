"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, CheckCircle, Loader2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { registerOwner } from "@/server/actions/registerOwner";

export default function OwnerSignupPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await registerOwner({
      name: String(form.get("name") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      email: String(form.get("email") ?? ""),
      city: String(form.get("city") ?? ""),
      password: String(form.get("password") ?? ""),
      aadhaar_number: String(form.get("aadhaar") ?? ""),
      license_number: String(form.get("dl") ?? ""),
      vehicle_type: String(form.get("category") ?? ""),
      vehicle_number: String(form.get("reg") ?? ""),
    });
    if (result.success) setSubmitted(true);
    else {
      setError(result.error ?? "Registration failed");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-secondary mb-4">Registration Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Please verify your email before logging in. Our team will verify your documents within 24 hours.
          </p>
          <Button href="/login/owner" variant="primary">Go to Owner Login</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Register as Vehicle Owner</h1>
          <p className="text-gray-600 mt-2">Start earning from your idle vehicle today</p>
          <Link href="/signup" className="text-sm text-primary hover:underline mt-2 inline-block">
            Change account type
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 p-8 shadow-sm space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <h2 className="text-lg font-semibold text-secondary border-b pb-3">Personal Details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Full Name" name="name" required />
            <FormField label="Mobile Number (optional)" name="mobile" type="tel" />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="City" name="city" required />
            <FormField label="Password" name="password" type="password" required />
          </div>
          <FormField label="Address" name="address" as="textarea" required />

          <h2 className="text-lg font-semibold text-secondary border-b pb-3 pt-4">KYC Documents</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Aadhaar Number" name="aadhaar" required />
            <FormField label="PAN Number" name="pan" required />
            <FormField label="Driving Licence" name="dl" required />
          </div>

          <h2 className="text-lg font-semibold text-secondary border-b pb-3 pt-4">Bank Details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Account Number" name="account" required />
            <FormField label="IFSC Code" name="ifsc" required />
            <FormField label="Bank Name" name="bank" required />
          </div>

          <h2 className="text-lg font-semibold text-secondary border-b pb-3 pt-4">Vehicle Details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Vehicle Make" name="make" required />
            <FormField label="Vehicle Model" name="model" required />
            <FormField label="Year" name="year" type="number" required />
            <FormField label="Registration Number" name="reg" required />
            <FormField
              label="Category"
              name="category"
              as="select"
              required
              options={[
                { value: "hatchback", label: "Hatchback" },
                { value: "sedan", label: "Sedan" },
                { value: "suv", label: "SUV" },
                { value: "luxury", label: "Luxury" },
                { value: "electric", label: "Electric" },
                { value: "tempo", label: "Tempo Traveller" },
              ]}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Register as Vehicle Owner"
            )}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
