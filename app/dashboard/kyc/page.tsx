import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
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
    <PageLayout>
      <SelfDriveKycAutoRedirect
        initialStatus={status}
        bookingReturn={bookingReturn}
        reason={reason}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav showKycLinks />

        <div className="text-center mb-10">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-secondary">Upload KYC Documents</h1>
          <p className="text-sm text-gray-500 mt-2">
            Required only for self-drive vehicle bookings. Other trips need mobile OTP verification only.
          </p>
          {reason === "self_drive" && (
            <p className="text-sm text-amber-600 mt-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2 inline-block">
              Complete KYC to continue your self-drive booking.
              {bookingReturn ? ` You will return to booking after approval.` : ""}
            </p>
          )}
          <div className="mt-3">
            <KycStatusBadge status={status === "approved" ? "verified" : status} />
          </div>
          {status === "pending" && hasRequiredDocs && (
            <p className="text-sm text-amber-600 mt-2">Documents submitted — status is Pending admin review.</p>
          )}
          {status === "not_submitted" && (
            <p className="text-sm text-amber-600 mt-2">
              Upload Aadhaar Front, Aadhaar Back, Driving License, and Selfie to submit KYC.
            </p>
          )}
          {status === "rejected" && (
            <p className="text-sm text-red-600 mt-2">KYC was rejected. Please re-upload your documents.</p>
          )}
          {status === "approved" && safeBookingReturn && (
            <p className="text-sm text-green-600 mt-2">
              Your KYC is approved.{" "}
              <a href={safeBookingReturn} className="underline font-medium">
                Continue your self-drive booking
              </a>
            </p>
          )}
          {status === "approved" && !safeBookingReturn && (
            <p className="text-sm text-green-600 mt-2">Your KYC is approved. You can book self-drive vehicles.</p>
          )}
          {loadError && (
            <p className="text-sm text-red-600 mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 whitespace-pre-wrap font-mono">
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
    </PageLayout>
  );
}
