import CustomerProfileForm from "@/components/forms/CustomerProfileForm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Profile",
  description: "Manage your customer profile on Rydez India.",
  path: "/dashboard/profile",
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your personal details</p>
      </div>
      <CustomerProfileForm
        email={user.email ?? ""}
        defaultValues={
          p
            ? {
                address: String(p.address ?? ""),
                city: String(p.city ?? ""),
                preferred_vehicle_type: String(p.preferred_vehicle_type ?? ""),
              }
            : undefined
        }
      />
    </div>
  );
}
