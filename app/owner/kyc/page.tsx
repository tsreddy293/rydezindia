import { ShieldCheck } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import Button from "@/components/ui/Button";
import KycStatusBadge from "@/components/trust/KycStatusBadge";
import { requireRole } from "@/server/actions/auth";
import { submitOwnerKyc } from "@/server/actions/kyc";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerKycVerified } from "@/lib/services/verification";

export const dynamic = "force-dynamic";

export default async function OwnerKycPage() {
  const { user } = await requireRole("owner");
  const db = createAdminClient();
  const { data: kyc } = await db.from("owner_kyc").select("*").eq("owner_id", user.id).maybeSingle();
  const verified = await isOwnerKycVerified(user.id);
  const k = kyc as Record<string, unknown> | null;
  const status = verified ? "verified" : String(k?.status ?? "not_submitted");

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <div className="text-center mb-10">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-secondary">Owner KYC</h1>
          <div className="mt-3"><KycStatusBadge status={status === "approved" ? "verified" : status} /></div>
          {!verified && (
            <p className="text-sm text-amber-600 mt-2">You must complete KYC before receiving bookings.</p>
          )}
        </div>

        {k && (
          <div className="mb-6 flex flex-wrap gap-3 text-sm">
            {k.aadhaar_url ? <a href={String(k.aadhaar_url)} target="_blank" rel="noopener" className="text-primary underline">Preview Aadhaar</a> : null}
            {k.pan_url ? <a href={String(k.pan_url)} target="_blank" rel="noopener" className="text-primary underline">Preview PAN</a> : null}
            {k.selfie_url ? <a href={String(k.selfie_url)} target="_blank" rel="noopener" className="text-primary underline">Preview Selfie</a> : null}
          </div>
        )}

        <form action={submitOwnerKyc} className="rounded-2xl bg-white border p-8 shadow-sm space-y-6">
          {[
            ["aadhaar", "Aadhaar Card"],
            ["pan", "PAN Card"],
            ["selfie", "Selfie Photo"],
          ].map(([name, label]) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <input name={name} type="file" accept="image/*,.pdf" required={!k} className="w-full text-sm" />
            </div>
          ))}
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {k ? "Re-upload Documents" : "Submit KYC"}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
