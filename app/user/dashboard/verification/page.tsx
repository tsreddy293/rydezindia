import { AlertCircle, CheckCircle2, Shield } from "lucide-react";
import RiderKycUploadForm from "@/components/forms/RiderKycUploadForm";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { fetchLoyaltyStatus } from "@/server/actions/phase2";
import { DEFAULT_LOYALTY_STATUS } from "@/lib/services/loyalty";
import type { CustomerKycDocumentSet } from "@/lib/admin/customer-kyc-fields";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ submitted?: string }>;
}

export const metadata = createPageMetadata({
  title: "Verification Status",
  description: "Check your verification and loyalty status on Rydez India.",
  path: "/dashboard/verification",
  noIndex: true,
});

export default async function VerificationDashboardPage({ searchParams }: Props) {
  const { user } = await requireRole("user");
  const { submitted } = await searchParams;

  let loadError: string | undefined;
  let status: "not_submitted" | "pending" | "approved" | "rejected" = "not_submitted";
  let documents: CustomerKycDocumentSet = {};
  let hasRequiredDocs = false;
  let canSubmit = true;

  try {
    const kyc = await getCustomerKycStatus(user.id);
    status = kyc.status;
    documents = kyc.documents;
    hasRequiredDocs = kyc.hasRequiredDocs;
    canSubmit = kyc.canSubmit;
    loadError = kyc.loadError;
  } catch (error) {
    console.error("[VerificationDashboardPage] KYC load failed:", error);
    loadError = "We couldn't load your verification status right now. You can still upload documents below.";
  }

  let loyalty = DEFAULT_LOYALTY_STATUS;
  try {
    loyalty = await fetchLoyaltyStatus(user.id);
  } catch (error) {
    console.error("[VerificationDashboardPage] loyalty load failed:", error);
  }

  const statusMessage =
    status === "approved"
      ? "Your identity is verified. You have full access to all booking features."
      : status === "pending"
        ? "Your documents are under review."
        : status === "rejected"
          ? "Your KYC was rejected. Please re-upload documents."
          : "Complete KYC to unlock verified user badge and priority support.";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Verification</h1>
        <p className="mt-1 text-sm text-gray-500">Identity and loyalty status</p>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Documents submitted successfully. Review usually takes 24–48 hours.
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{loadError}</p>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-secondary">Identity Verification</h2>
          </div>
          <KycStatusBadge status={status === "approved" ? "verified" : status} />
        </div>
        <p className="mb-4 text-sm text-gray-500">{statusMessage}</p>
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          {documents.aadhaar_front_url && (
            <a href={documents.aadhaar_front_url} target="_blank" rel="noopener" className="text-primary underline">
              Preview Aadhaar Front
            </a>
          )}
          {documents.aadhaar_back_url && (
            <a href={documents.aadhaar_back_url} target="_blank" rel="noopener" className="text-primary underline">
              Preview Aadhaar Back
            </a>
          )}
          {documents.driving_license_url && (
            <a href={documents.driving_license_url} target="_blank" rel="noopener" className="text-primary underline">
              Preview Driving License
            </a>
          )}
          {documents.selfie_url && (
            <a href={documents.selfie_url} target="_blank" rel="noopener" className="text-primary underline">
              Preview Selfie
            </a>
          )}
        </div>
      </div>

      {status !== "approved" && (
        <RiderKycUploadForm documents={documents} status={status} canSubmit={canSubmit} />
      )}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold capitalize text-secondary">{loyalty.tier} Member</h2>
        <p className="mb-3 text-sm text-gray-500">
          {loyalty.points} loyalty points · {loyalty.discountPercent}% extra discount
        </p>
        <ul className="space-y-1 text-sm text-gray-600">
          {loyalty.benefits.map((b) => (
            <li key={b}>• {b}</li>
          ))}
        </ul>
        {loyalty.nextTier && (
          <p className="mt-3 text-xs text-gray-400">
            {loyalty.pointsToNext} points to {loyalty.nextTier}
          </p>
        )}
      </div>
    </div>
  );
}
