"use client";

import { useState } from "react";
import FormField from "@/components/forms/FormField";
import Button from "@/components/ui/Button";
import { saveEmergencyContacts } from "@/server/actions/phase2";

interface Props {
  defaultValues?: {
    contact1_name?: string;
    contact1_phone?: string;
    contact2_name?: string;
    contact2_phone?: string;
  };
}

export default function EmergencyContactsForm({ defaultValues }: Props) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await saveEmergencyContacts(new FormData(e.currentTarget));
    if (result.success) setMessage("Emergency contacts saved");
    else setError(result.error ?? "Failed to save");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
      <h3 className="font-semibold text-secondary">Emergency Contacts</h3>
      <p className="text-sm text-gray-500">These contacts will be notified when you trigger SOS.</p>
      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Family Contact 1 — Name" name="contact1_name" defaultValue={defaultValues?.contact1_name} />
        <FormField label="Family Contact 1 — Phone" name="contact1_phone" type="tel" defaultValue={defaultValues?.contact1_phone} />
        <FormField label="Family Contact 2 — Name" name="contact2_name" defaultValue={defaultValues?.contact2_name} />
        <FormField label="Family Contact 2 — Phone" name="contact2_phone" type="tel" defaultValue={defaultValues?.contact2_phone} />
      </div>
      <Button type="submit" variant="primary">Save Contacts</Button>
    </form>
  );
}
