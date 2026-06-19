import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import OwnerProfileForm from "@/components/forms/OwnerProfileForm";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import Button from "@/components/ui/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownerProfileDocumentsToSet } from "@/lib/services/owner-profile-kyc";
import { ownerKycCanApprove } from "@/lib/admin/owner-kyc";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Owner Profile",
  description: "Manage your owner profile on Rydez India.",
  path: "/owner/profile",
  noIndex: true,
});

export default async function OwnerProfilePage() {
  const { user } = await requireRole("owner");
  const db = createAdminClient();

  const [{ data: profile }, { data: userRow }] = await Promise.all([
    db.from("owner_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    db.from("users").select("kyc_status").eq("id", user.id).maybeSingle(),
  ]);

  const p = profile as Record<string, unknown> | null;
  const kycStatus = String((userRow as { kyc_status?: string } | null)?.kyc_status ?? "not_submitted");
  const documents = ownerProfileDocumentsToSet(
    p
      ? {
          user_id: user.id,
          aadhaar_document_url: p.aadhaar_document_url ? String(p.aadhaar_document_url) : null,
          license_document_url: p.license_document_url ? String(p.license_document_url) : null,
          selfie_document_url: p.selfie_document_url ? String(p.selfie_document_url) : null,
          address_proof_url: p.address_proof_url ? String(p.address_proof_url) : null,
          aadhaar_number: p.aadhaar_number ? String(p.aadhaar_number) : null,
          license_number: p.license_number ? String(p.license_number) : null,
          kyc_submitted_at: p.kyc_submitted_at ? String(p.kyc_submitted_at) : null,
        }
      : null
  );
  const docsComplete = ownerKycCanApprove(documents);

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />

        <section className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-secondary">KYC Verification</h2>
                <div className="mt-1">
                  <KycStatusBadge status={kycStatus === "verified" ? "verified" : kycStatus} />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {docsComplete
                    ? "Required documents uploaded. Admin will review your KYC."
                    : "Upload Aadhaar, Driving License, Selfie, and Address Proof to complete verification."}
                </p>
              </div>
            </div>
            <Button href="/owner/kyc" variant="primary" size="sm">
              {docsComplete ? "Manage KYC" : "Upload Documents"}
            </Button>
          </div>
          {docsComplete && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {documents.aadhaar && (
                <Link href={documents.aadhaar} target="_blank" className="text-primary underline">
                  Aadhaar
                </Link>
              )}
              {documents.license && (
                <Link href={documents.license} target="_blank" className="text-primary underline">
                  License
                </Link>
              )}
              {documents.selfie && (
                <Link href={documents.selfie} target="_blank" className="text-primary underline">
                  Selfie
                </Link>
              )}
              {documents.address_proof && (
                <Link href={documents.address_proof} target="_blank" className="text-primary underline">
                  Address Proof
                </Link>
              )}
            </div>
          )}
        </section>

        <OwnerProfileForm
          email={user.email ?? ""}
          defaultValues={
            p
              ? {
                  business_name: String(p.business_name ?? ""),
                  address: String(p.address ?? ""),
                  city: String(p.city ?? ""),
                  pan_number: String(p.pan_number ?? ""),
                  gst_number: String(p.gst_number ?? ""),
                  bank_account: String(p.bank_account ?? ""),
                  ifsc_code: String(p.ifsc_code ?? ""),
                }
              : undefined
          }
        />
      </div>
    </PageLayout>
  );
}
