import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import OwnerProfileForm from "@/components/forms/OwnerProfileForm";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { data: profile } = await db
    .from("owner_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const p = profile as Record<string, unknown> | null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <OwnerProfileForm
          email={user.email ?? ""}
          defaultValues={p ? {
            business_name: String(p.business_name ?? ""),
            address: String(p.address ?? ""),
            city: String(p.city ?? ""),
            pan_number: String(p.pan_number ?? ""),
            gst_number: String(p.gst_number ?? ""),
            bank_account: String(p.bank_account ?? ""),
            ifsc_code: String(p.ifsc_code ?? ""),
          } : undefined}
        />
      </div>
    </PageLayout>
  );
}
