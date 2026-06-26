import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import RiderKycUploadForm from "@/components/forms/RiderKycUploadForm";
import SelfDriveKycAutoRedirect from "@/components/kyc/SelfDriveKycAutoRedirect";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { getCustomerKyc, hasCustomerKycRecord } from "@/lib/services/customer-kyc";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";
import { recordSelfDriveInterestForUser } from "@/server/actions/selfDrive";
import { buildDashboardKycReturnPath, safeRiderRedirectPath } from "@/lib/kyc/self-drive-nav";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ reason?: string; return?: string }>;
}

export const metadata = createPageMetadata({
  title: "Upload KYC Documents",
  description: "Upload Aadhaar, driving license, and selfie for Rydez India self-drive verification.",
  path: "/dashboard/kyc",
  noIndex: true,
});

export default async function DashboardKycPage({ searchParams }: Props) {
  const params = await searchParams;
  const returnPath = buildDashboardKycReturnPath(params);
  const { user } = await requireRole("user", returnPath);
  const { reason, return: bookingReturn } = params;
  await recordSelfDriveInterestForUser(user.id);
  const { status, documents, hasRequiredDocs, canSubmit, loadError } = await getCustomerKycStatus(user.id);

  const kycRow = status === "approved" ? await getCustomerKyc(user.id) : null;
  const storedReturn = safeRiderRedirectPath(
    String(
      hasCustomerKycRecord(kycRow) ? (kycRow as { self_drive_return_path?: string }).self_drive_return_path ?? "" : ""
    )
  );
  const safeBookingReturn = safeRiderRedirectPath(bookingReturn) ?? storedReturn;
  if (reason === "self_drive" && status === "approved" && safeBookingReturn) {
    redirect(safeBookingReturn);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <SelfDriveKycAutoRedirect
        initialStatus={status}
        bookingReturn={bookingReturn}
        reason={reason}
      />
      <div className="text-center">
        <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Upload KYC Documents</h1>
        <p className="mt-2 text-sm text-gray-500">
          Required only for self-drive vehicle bookings.
        </p>
        <div className="mt-3">
          <KycStatusBadge status={status === "approved" ? "verified" : status} />
        </div>
        {loadError && (
          <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {loadError}
          </p>
        )}
      </div>
      <RiderKycUploadForm
        documents={documents}
        status={status}
        canSubmit={canSubmit && !loadError}
        selfDriveReturnPath={safeBookingReturn ?? undefined}
      />
    </div>
  );
}
