"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, Loader2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { registerOwnerAndRedirect } from "@/server/actions/registerOwner";

export default function OwnerSignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      await registerOwnerAndRedirect({
        name: String(form.get("name") ?? ""),
        mobile: String(form.get("mobile") ?? ""),
        email: String(form.get("email") ?? ""),
        city: String(form.get("city") ?? ""),
        password: String(form.get("password") ?? ""),
        address: String(form.get("address") ?? ""),
        aadhaar_number: String(form.get("aadhaar") ?? ""),
        pan_number: String(form.get("pan") ?? ""),
        license_number: String(form.get("dl") ?? ""),
        bank_account: String(form.get("account") ?? ""),
        ifsc_code: String(form.get("ifsc") ?? ""),
        bank_name: String(form.get("bank") ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Register as Vehicle Owner</h1>
          <p className="text-gray-600 mt-2">
            Create your account first — add vehicles from your dashboard after signup.
          </p>
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
            <FormField label="Mobile Number" name="mobile" type="tel" placeholder="9876543210" />
            <FormField label="Email" name="email" type="email" required />
            <FormField label="City" name="city" required />
            <FormField label="Password" name="password" type="password" required placeholder="Minimum 8 characters" />
          </div>
          <FormField label="Address" name="address" as="textarea" required />

          <h2 className="text-lg font-semibold text-secondary border-b pb-3 pt-4">KYC Documents</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Aadhaar Number" name="aadhaar" required placeholder="12-digit Aadhaar" />
            <FormField label="PAN Number" name="pan" required placeholder="ABCDE1234F" />
            <FormField label="Driving Licence" name="dl" required />
          </div>

          <h2 className="text-lg font-semibold text-secondary border-b pb-3 pt-4">Bank Details</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Account Number" name="account" required />
            <FormField label="IFSC Code" name="ifsc" required placeholder="SBIN0001234" />
            <FormField label="Bank Name" name="bank" required />
          </div>

          <p className="text-sm text-gray-500 rounded-xl bg-gray-50 px-4 py-3">
            Vehicle details are added separately after registration from your owner dashboard.
          </p>

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Owner Account"
            )}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
