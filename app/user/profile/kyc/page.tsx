import { ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import Button from "@/components/ui/Button";
import { getCustomerKycStatus } from "@/server/actions/customerKyc";
import { submitCustomerKyc } from "@/server/actions/customerKyc";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "KYC Verification",
  description: "Complete your identity verification on Rydez India.",
  path: "/user/profile/kyc",
  noIndex: true,
});

export default async function CustomerKycPage() {
  await requireRole("user");
  const { status, kyc } = await getCustomerKycStatus();
  const docs = kyc as Record<string, string> | null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <div className="text-center mb-8">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-secondary">Customer KYC</h1>
          <div className="mt-3"><KycStatusBadge status={status} /></div>
        </div>

        {docs && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 grid gap-2 sm:grid-cols-3 text-sm">
            {docs.aadhaar_url && <a href={docs.aadhaar_url} target="_blank" rel="noopener" className="text-primary underline">View Aadhaar</a>}
            {docs.license_url && <a href={docs.license_url} target="_blank" rel="noopener" className="text-primary underline">View License</a>}
            {docs.selfie_url && <a href={docs.selfie_url} target="_blank" rel="noopener" className="text-primary underline">View Selfie</a>}
          </div>
        )}

        <form action={submitCustomerKyc} className="rounded-2xl bg-white border p-8 shadow-sm space-y-6">
          <p className="text-sm text-gray-500">Upload clear photos or PDFs. Re-upload to update rejected documents.</p>
          {(
            [
              ["aadhaar", "Aadhaar Card", status === "not_submitted"],
              ["license", "Driving License", status === "not_submitted"],
              ["selfie", "Selfie Photo", status === "not_submitted"],
            ] as [string, string, boolean][]
          ).map(([name, label, required]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <input name={name} type="file" accept="image/*,.pdf" required={required && !docs} className="w-full text-sm" />
            </div>
          ))}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {status === "rejected" ? "Re-upload Documents" : "Submit for Verification"}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
