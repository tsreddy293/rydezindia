"use client";

import { useState } from "react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { updateCustomerProfile } from "@/server/actions/profiles";

interface Props {
  email: string;
  defaultValues?: { address?: string; city?: string; preferred_vehicle_type?: string };
}

export default function CustomerProfileForm({ email, defaultValues }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await updateCustomerProfile(new FormData(e.currentTarget));
    if (result.success) setMessage("Profile updated");
    else setError(result.error ?? "Update failed");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 md:p-8 space-y-5 shadow-sm">
      <h2 className="text-xl font-bold text-secondary">Profile</h2>
      <p className="text-sm text-gray-500">Email: {email}</p>
      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <FormField label="Address" name="address" defaultValue={defaultValues?.address} />
      <FormField label="City" name="city" defaultValue={defaultValues?.city} />
      <FormField label="Preferred Vehicle Type" name="preferred_vehicle_type" defaultValue={defaultValues?.preferred_vehicle_type} />
      <Button type="submit" variant="primary">Save Profile</Button>
    </form>
  );
}
