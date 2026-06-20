"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { submitOwnerProfileKyc } from "@/server/actions/ownerKyc";
import type { OwnerKycDocumentSet } from "@/lib/admin/owner-kyc";
import {
  ownerKycUploadRule,
  validateOwnerKycUploadFile,
  type OwnerKycUploadField,
} from "@/lib/kyc/upload-rules";
import { prepareKycFileForUpload } from "@/lib/kyc/compress-image";

const UPLOAD_FIELDS: Array<{
  name: OwnerKycUploadField;
  docKey: keyof OwnerKycDocumentSet;
  label: string;
  required: boolean;
}> = [
  { name: "aadhaar", docKey: "aadhaar", label: "Aadhaar Card", required: true },
  { name: "license", docKey: "license", label: "Driving License", required: true },
  { name: "selfie", docKey: "selfie", label: "Selfie Photo", required: false },
  { name: "address_proof", docKey: "address_proof", label: "Address Proof", required: false },
];

interface Props {
  documents: OwnerKycDocumentSet;
  status: string;
  canSubmit: boolean;
}

function DocPreview({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline"
    >
      View {label}
    </a>
  );
}

export default function OwnerKycUploadForm({ documents, status, canSubmit }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const form = event.currentTarget;
      const outbound = new FormData();

      for (const { name } of UPLOAD_FIELDS) {
        const input = form.elements.namedItem(name) as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) continue;

        const validationError = validateOwnerKycUploadFile(file, name);
        if (validationError) {
          setError(validationError);
          setBusy(false);
          return;
        }

        const rule = ownerKycUploadRule(name);
        const prepared = await prepareKycFileForUpload(file, rule.maxBytes);
        const sizeError = validateOwnerKycUploadFile(prepared, name);
        if (sizeError) {
          setError(
            `${rule.label}: File is still too large after compression (${Math.ceil(prepared.size / 1024)} KB). Try a smaller image.`
          );
          setBusy(false);
          return;
        }
        outbound.append(name, prepared);
      }

      const result = await submitOwnerProfileKyc(outbound);
      if (result.success) {
        setSuccess(result.message ?? "Documents submitted successfully.");
        router.refresh();
      } else {
        setError(result.error ?? "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }

    setBusy(false);
  }

  const hasExisting = Boolean(
    documents.aadhaar || documents.license || documents.selfie || documents.address_proof
  );

  return (
    <div className="space-y-6">
      {hasExisting && (
        <div className="rounded-xl bg-gray-50 p-4 grid gap-2 sm:grid-cols-2">
          <DocPreview label="Aadhaar" url={documents.aadhaar} />
          <DocPreview label="Driving License" url={documents.license} />
          <DocPreview label="Selfie" url={documents.selfie} />
          <DocPreview label="Address Proof" url={documents.address_proof} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-2xl bg-white border p-8 shadow-sm space-y-6">
        <p className="text-sm text-gray-500">
          Upload clear photos or PDFs. Images are compressed automatically. Aadhaar and Driving License are required
          for admin approval.
          {status === "rejected" ? " Please re-upload after rejection." : ""}
        </p>

        {UPLOAD_FIELDS.map(({ name, docKey, label, required }) => {
          const rule = ownerKycUploadRule(name);
          const maxKb = Math.round(rule.maxBytes / 1024);
          const accept =
            name === "selfie"
              ? "image/jpeg,image/png,.jpg,.jpeg,.png"
              : "image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";
          return (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <p className="text-xs text-gray-400 mb-2">
                {name === "selfie" ? `JPG/PNG, max ${maxKb} KB` : `JPG/PNG/PDF, max ${maxKb} KB`}
              </p>
              <input
                name={name}
                type="file"
                accept={accept}
                required={required && !documents[docKey]}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
              />
            </div>
          );
        })}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || !canSubmit}>
          {busy
            ? "Uploading..."
            : status === "rejected"
              ? "Re-upload Documents"
              : hasExisting
                ? "Update & Resubmit KYC"
                : "Submit for Verification"}
        </Button>

        {!canSubmit && (
          <p className="text-center text-sm text-green-600">Your KYC is verified. No action needed.</p>
        )}
      </form>
    </div>
  );
}
