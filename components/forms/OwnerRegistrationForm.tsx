"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Car, Loader2 } from "lucide-react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { registerOwnerAndRedirect } from "@/server/actions/registerOwner";

export default function OwnerRegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);

    try {
      await registerOwnerAndRedirect({
        name: String(form.get("name") ?? ""),
        mobile: String(form.get("mobile") ?? ""),
        email: String(form.get("email") ?? ""),
        city: String(form.get("city") ?? ""),
        password: String(form.get("password") ?? ""),
        address: String(form.get("address") ?? ""),
        aadhaar_number: String(form.get("aadhaar_number") ?? ""),
        pan_number: String(form.get("pan_number") ?? ""),
        license_number: String(form.get("license_number") ?? ""),
        bank_account: String(form.get("bank_account") ?? ""),
        ifsc_code: String(form.get("ifsc_code") ?? ""),
        bank_name: String(form.get("bank_name") ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
            <p className="text-sm text-gray-500">Account only — add vehicles after signup</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Full Name" name="name" required placeholder="Ravi Kumar" />
          <FormField label="Mobile Number" name="mobile" type="tel" placeholder="9876543210" />
          <FormField label="Email Address" name="email" type="email" required placeholder="you@email.com" />
          <FormField label="City" name="city" required placeholder="Hyderabad" />
          <FormField label="Password" name="password" type="password" required placeholder="Minimum 8 characters" />
          <FormField label="Aadhaar Number" name="aadhaar_number" required placeholder="123456789012" />
          <FormField label="PAN Number" name="pan_number" required placeholder="ABCDE1234F" />
          <FormField label="Driving Licence" name="license_number" required placeholder="TS01234567890123" />
        </div>
        <FormField label="Address" name="address" as="textarea" required />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Account Number" name="bank_account" required />
          <FormField label="IFSC Code" name="ifsc_code" required placeholder="SBIN0001234" />
          <FormField label="Bank Name" name="bank_name" required />
        </div>

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
    </motion.div>
  );
}
