"use client";

import Link from "next/link";
import { CheckCircle, Clock, ExternalLink, FileText, Shield, Upload, XCircle } from "lucide-react";
import OwnerKycUploadForm from "@/components/forms/OwnerKycUploadForm";
import type { OwnerKycDocumentSet } from "@/lib/admin/owner-kyc";

const DOC_CARDS: Array<{
  key: keyof OwnerKycDocumentSet | "pan";
  label: string;
  required?: boolean;
}> = [
  { key: "aadhaar", label: "Aadhaar", required: true },
  { key: "license", label: "Driving License", required: true },
  { key: "address_proof", label: "Address Proof" },
  { key: "pan", label: "PAN" },
  { key: "selfie", label: "Selfie" },
];

function statusStyle(status: string) {
  if (status === "verified") return { icon: CheckCircle, class: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Verified" };
  if (status === "rejected") return { icon: XCircle, class: "text-red-600 bg-red-50 border-red-200", label: "Rejected" };
  return { icon: Clock, class: "text-amber-600 bg-amber-50 border-amber-200", label: "Pending" };
}

interface Props {
  status: string;
  documents: OwnerKycDocumentSet;
  canSubmit: boolean;
  panFromProfile?: string;
}

export default function OwnerKycHub({ status, documents, canSubmit, panFromProfile }: Props) {
  const s = statusStyle(status);
  const StatusIcon = s.icon;

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-4 rounded-2xl border p-5 ${s.class}`}>
        <StatusIcon className="h-10 w-10 shrink-0" />
        <div>
          <p className="font-bold">Verification Status: {s.label}</p>
          <p className="text-sm opacity-80">Upload and maintain valid identity documents for your host account.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DOC_CARDS.map((doc) => {
          const url = doc.key === "pan" ? undefined : documents[doc.key as keyof OwnerKycDocumentSet];
          const hasFile = doc.key === "pan" ? Boolean(panFromProfile) : Boolean(url);
          return (
            <div key={doc.key} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-900">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{doc.label}</h3>
                </div>
                {doc.required && <span className="text-[10px] font-bold text-red-500">REQUIRED</span>}
              </div>
              <div className="mt-4 flex h-28 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
                {hasFile ? (
                  <Shield className="h-8 w-8 text-emerald-500" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">{hasFile ? "Document on file" : "Not uploaded"}</p>
              {doc.key === "pan" && panFromProfile && <p className="text-xs font-mono">{panFromProfile}</p>}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Preview <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <Link href="#upload-form" className="mt-2 block text-sm font-medium text-secondary hover:text-primary">
                {hasFile ? "Replace" : "Upload"}
              </Link>
            </div>
          );
        })}
      </div>

      <div id="upload-form" className="rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Upload Documents</h3>
        <OwnerKycUploadForm documents={documents} status={status} canSubmit={canSubmit} />
      </div>
    </div>
  );
}
