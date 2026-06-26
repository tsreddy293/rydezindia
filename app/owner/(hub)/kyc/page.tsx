import nextDynamic from "next/dynamic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
import { requireRole } from "@/server/actions/auth";

const OwnerKycHub = nextDynamic(() => import("@/components/owner/kyc/OwnerKycHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Owner KYC Verification",
  description: "Upload identity documents for Rydez India owner verification.",
  path: "/owner/kyc",
  noIndex: true,
});

export default async function OwnerKycPage() {
  const { user } = await requireRole("owner");
  const [kyc, profileRes] = await Promise.all([
    getOwnerKycStatus(),
    createAdminClient().from("owner_profiles").select("pan_number").eq("user_id", user.id).maybeSingle(),
  ]);

  const { status, documents, canSubmit } = kyc;
  const pan = profileRes.data ? String((profileRes.data as Record<string, unknown>).pan_number ?? "") : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">KYC & Documents</h1>
        <p className="mt-1 text-sm text-gray-500">Identity verification for your host account</p>
      </div>
      <OwnerKycHub status={status} documents={documents} canSubmit={canSubmit} panFromProfile={pan || undefined} />
    </div>
  );
}
