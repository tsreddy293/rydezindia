import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import EmergencyContactsForm from "@/components/forms/EmergencyContactsForm";
import SosButton from "@/components/safety/SosButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Safety",
  description: "Manage emergency contacts and SOS on Rydez India.",
  path: "/user/profile/safety",
  noIndex: true,
});

export default async function SafetyPage() {
  const { user } = await requireRole("user");
  const db = createAdminClient();
  const { data: contacts } = await db
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const c = contacts as Record<string, string> | null;

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Safety</h1>
        <EmergencyContactsForm
          defaultValues={c ? {
            contact1_name: c.contact1_name,
            contact1_phone: c.contact1_phone,
            contact2_name: c.contact2_name,
            contact2_phone: c.contact2_phone,
          } : undefined}
        />
        <p className="text-xs text-gray-400 mt-6 text-center">
          Live trip sharing coming soon. SOS notifies your emergency contacts and Rydez support.
        </p>
      </div>
      <SosButton />
    </PageLayout>
  );
}
