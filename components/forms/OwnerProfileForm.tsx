"use client";

import { useState } from "react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { updateOwnerProfile } from "@/server/actions/profiles";

interface Props {
  email: string;
  defaultValues?: {
    business_name?: string;
    address?: string;
    city?: string;
    pan_number?: string;
    gst_number?: string;
    bank_account?: string;
    ifsc_code?: string;
  };
}

export default function OwnerProfileForm({ email, defaultValues }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await updateOwnerProfile(formData);
    if (result.success) setMessage("Profile updated successfully");
    else setError(result.error ?? "Update failed");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 md:p-8 space-y-5 shadow-sm">
      <h2 className="text-xl font-bold text-secondary">Owner Profile</h2>
      <p className="text-sm text-gray-500">Email: {email}</p>
      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <FormField label="Business Name" name="business_name" defaultValue={defaultValues?.business_name} />
      <FormField label="Address" name="address" defaultValue={defaultValues?.address} />
      <FormField label="City" name="city" defaultValue={defaultValues?.city} />
      <FormField label="PAN Number" name="pan_number" defaultValue={defaultValues?.pan_number} />
      <FormField label="GST Number" name="gst_number" defaultValue={defaultValues?.gst_number} />
      <FormField label="Bank Account" name="bank_account" defaultValue={defaultValues?.bank_account} />
      <FormField label="IFSC Code" name="ifsc_code" defaultValue={defaultValues?.ifsc_code} />
      <Button type="submit" variant="primary">Save Profile</Button>
    </form>
  );
}
