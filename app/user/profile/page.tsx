import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import CustomerProfileForm from "@/components/forms/CustomerProfileForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Profile",
  description: "Manage your customer profile on Rydez India.",
  path: "/user/profile",
  noIndex: true,
});

export default async function UserProfilePage() {
  const { user } = await requireRole("user");
  const db = createAdminClient();
  const { data: profile } = await db
    .from("customer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const p = profile as Record<string, unknown> | null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <CustomerProfileForm
          email={user.email ?? ""}
          defaultValues={p ? {
            address: String(p.address ?? ""),
            city: String(p.city ?? ""),
            preferred_vehicle_type: String(p.preferred_vehicle_type ?? ""),
          } : undefined}
        />
      </div>
    </PageLayout>
  );
}
