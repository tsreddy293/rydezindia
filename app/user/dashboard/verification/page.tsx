import Link from "next/link";
import { Shield, CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import Button from "@/components/ui/Button";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { fetchLoyaltyStatus } from "@/server/actions/phase2";
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
  await requireRole("user");
  const { submitted } = await searchParams;
  const { status, kyc } = await getCustomerKycStatus();
  const loyalty = await fetchLoyaltyStatus();
  const docs = kyc as Record<string, string> | null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Verification</h1>

        {submitted && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Documents submitted successfully. Review usually takes 24–48 hours.
          </div>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-secondary">Identity Verification</h2>
            </div>
            <KycStatusBadge status={status} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {status === "verified"
              ? "Your identity is verified. You have full access to all booking features."
              : status === "pending"
                ? "Your documents are under review."
                : status === "rejected"
                  ? "Your KYC was rejected. Please re-upload documents."
                  : "Complete KYC to unlock verified user badge and priority support."}
          </p>
          {docs && (
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
              {docs.aadhaar_url && <a href={docs.aadhaar_url} target="_blank" rel="noopener" className="text-primary underline">Preview Aadhaar</a>}
              {docs.license_url && <a href={docs.license_url} target="_blank" rel="noopener" className="text-primary underline">Preview License</a>}
              {docs.selfie_url && <a href={docs.selfie_url} target="_blank" rel="noopener" className="text-primary underline">Preview Selfie</a>}
            </div>
          )}
          <Button href="/user/profile/kyc" variant="primary" size="sm">
            {status === "verified" ? "Update Documents" : "Upload Documents"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-secondary mb-2 capitalize">{loyalty.tier} Member</h2>
          <p className="text-sm text-gray-500 mb-3">{loyalty.points} loyalty points · {loyalty.discountPercent}% extra discount</p>
          <ul className="text-sm text-gray-600 space-y-1">
            {loyalty.benefits.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
          {loyalty.nextTier && (
            <p className="text-xs text-gray-400 mt-3">{loyalty.pointsToNext} points to {loyalty.nextTier}</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
