"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { submitCustomerKyc } from "@/server/actions/customerKyc";
import type { CustomerKycDocumentSet } from "@/lib/admin/customer-kyc-fields";

const UPLOAD_FIELDS = [
  { name: "aadhaar_front", key: "aadhaar_front_url" as const, label: "Aadhaar Front", required: true },
  { name: "aadhaar_back", key: "aadhaar_back_url" as const, label: "Aadhaar Back", required: true },
  { name: "driving_license", key: "driving_license_url" as const, label: "Driving License", required: true },
  { name: "selfie", key: "selfie_url" as const, label: "Selfie Photo", required: false },
];

interface Props {
  documents: CustomerKycDocumentSet;
  status: string;
  canSubmit: boolean;
}

function DocPreview({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
      View {label}
    </a>
  );
}

export default function RiderKycUploadForm({ documents, status, canSubmit }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const result = await submitCustomerKyc(new FormData(event.currentTarget));
    if (result.success) {
      setSuccess(result.message ?? "Documents submitted successfully.");
      router.refresh();
    } else {
      setError(result.error ?? "Upload failed");
    }
    setBusy(false);
  }

  const hasExisting = Boolean(
    documents.aadhaar_front_url ||
      documents.aadhaar_back_url ||
      documents.driving_license_url ||
      documents.selfie_url
  );

  return (
    <div className="space-y-6">
      {hasExisting && (
        <div className="rounded-xl bg-gray-50 p-4 grid gap-2 sm:grid-cols-2">
          <DocPreview label="Aadhaar Front" url={documents.aadhaar_front_url} />
          <DocPreview label="Aadhaar Back" url={documents.aadhaar_back_url} />
          <DocPreview label="Driving License" url={documents.driving_license_url} />
          <DocPreview label="Selfie" url={documents.selfie_url} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-2xl bg-white border p-8 shadow-sm space-y-6">
        <p className="text-sm text-gray-500">
          Upload clear photos or PDFs. Aadhaar Front, Aadhaar Back, and Driving License are required. Selfie is optional.
          {status === "rejected" ? " Please re-upload after rejection." : ""}
        </p>

        {UPLOAD_FIELDS.map(({ name, key, label, required }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
              name={name}
              type="file"
              accept="image/*,.pdf"
              required={required && !documents[key]}
              className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
          </div>
        ))}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !canSubmit}>
          {busy
            ? "Uploading..."
            : status === "rejected"
              ? "Re-upload Documents"
              : hasExisting
                ? "Update & Resubmit KYC"
                : "Submit for Verification"}
        </Button>

        {!canSubmit && status === "approved" && (
          <p className="text-center text-sm text-green-600">Your KYC is approved. No action needed.</p>
        )}
      </form>
    </div>
  );
}
