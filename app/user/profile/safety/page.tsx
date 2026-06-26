import EmergencyContactsForm from "@/components/forms/EmergencyContactsForm";
import SosButton from "@/components/safety/SosButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Safety & Support",
  description: "Manage emergency contacts and SOS on Rydez India.",
  path: "/dashboard/support",
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
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary md:text-3xl">Safety & Support</h1>
          <p className="mt-1 text-sm text-gray-500">Emergency contacts and SOS</p>
        </div>
        <EmergencyContactsForm
          defaultValues={
            c
              ? {
                  contact1_name: c.contact1_name,
                  contact1_phone: c.contact1_phone,
                  contact2_name: c.contact2_name,
                  contact2_phone: c.contact2_phone,
                }
              : undefined
          }
        />
        <p className="text-center text-xs text-gray-400">
          Live trip sharing coming soon. SOS notifies your emergency contacts and Rydez support.
        </p>
      </div>
      <SosButton />
    </>
  );
}
