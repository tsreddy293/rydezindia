import { ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import RiderKycUploadForm from "@/components/forms/RiderKycUploadForm";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";
import { recordSelfDriveInterestForUser } from "@/server/actions/selfDrive";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Upload KYC Documents",
  description: "Upload identity documents for Rydez India self-drive verification.",
  path: "/user/profile/kyc",
  noIndex: true,
});

export default async function CustomerKycPage() {
  const { user } = await requireRole("user");
  await recordSelfDriveInterestForUser(user.id);
  const { status, documents, hasRequiredDocs, canSubmit } = await getCustomerKycStatus();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav showKycLinks />
        <div className="text-center mb-10">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-secondary">Upload KYC Documents</h1>
          <div className="mt-3">
            <KycStatusBadge status={status === "approved" ? "verified" : status} />
          </div>
          {status === "pending" && hasRequiredDocs && (
            <p className="text-sm text-amber-600 mt-2">Pending admin review.</p>
          )}
        </div>
        <RiderKycUploadForm documents={documents} status={status} canSubmit={canSubmit} />
      </div>
    </PageLayout>
  );
}
