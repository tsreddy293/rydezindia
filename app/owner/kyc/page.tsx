import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import OwnerKycUploadForm from "@/components/forms/OwnerKycUploadForm";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import Button from "@/components/ui/Button";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Owner KYC Verification",
  description: "Upload identity documents for Rydez India owner verification.",
  path: "/owner/kyc",
  noIndex: true,
});

export default async function OwnerKycPage() {
  await requireRole("owner");
  const { status, documents, hasRequiredDocs, canSubmit } = await getOwnerKycStatus();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <div className="text-center mb-10">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-secondary">Owner KYC Verification</h1>
          <div className="mt-3">
            <KycStatusBadge status={status} />
          </div>
          {status === "pending" && hasRequiredDocs && (
            <p className="text-sm text-amber-600 mt-2">Documents submitted — awaiting admin review.</p>
          )}
          {status === "pending" && !hasRequiredDocs && (
            <p className="text-sm text-amber-600 mt-2">
              Upload Aadhaar and Driving License to complete KYC verification.
            </p>
          )}
          {status === "rejected" && (
            <p className="text-sm text-red-600 mt-2">KYC was rejected. Please re-upload your documents.</p>
          )}
          {status === "verified" && (
            <p className="text-sm text-green-600 mt-2">Your KYC is verified.</p>
          )}
        </div>

        <OwnerKycUploadForm documents={documents} status={status} canSubmit={canSubmit} />

        <div className="mt-6 text-center">
          <Button href="/owner/profile" variant="outline" size="sm">
            Back to Profile
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
