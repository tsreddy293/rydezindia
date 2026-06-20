import { AlertCircle, CheckCircle2, Shield } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
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
  path: "/user/dashboard/verification",
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
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Verification</h1>

        {submitted && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Documents submitted successfully. Review usually takes 24–48 hours.
          </div>
        )}

        {loadError && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{loadError}</p>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-secondary">Identity Verification</h2>
            </div>
            <KycStatusBadge status={status === "approved" ? "verified" : status} />
          </div>
          <p className="text-sm text-gray-500 mb-4">{statusMessage}</p>
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
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

        {status === "approved" && hasRequiredDocs && (
          <p className="text-sm text-green-600 mb-6">Your identity is fully verified.</p>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-sm mt-6">
          <h2 className="font-semibold text-secondary mb-2 capitalize">{loyalty.tier} Member</h2>
          <p className="text-sm text-gray-500 mb-3">
            {loyalty.points} loyalty points · {loyalty.discountPercent}% extra discount
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            {loyalty.benefits.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
          {loyalty.nextTier && (
            <p className="text-xs text-gray-400 mt-3">
              {loyalty.pointsToNext} points to {loyalty.nextTier}
            </p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
