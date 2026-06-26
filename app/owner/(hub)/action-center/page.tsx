import OwnerActionCenter from "@/components/owner/dashboard/OwnerActionCenter";
import OwnerDocumentReminders from "@/components/owner/dashboard/OwnerDocumentReminders";
import { getOwnerDashboardData } from "@/lib/owner/dashboard-data";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Action Center",
  description: "Pending actions for your Rydez India host account.",
  path: "/owner/action-center",
  noIndex: true,
});

export default async function OwnerActionCenterPage() {
  const { user } = await requireRole("owner");
  const data = await getOwnerDashboardData(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Action Center</h1>
        <p className="mt-1 text-sm text-gray-500">Items that need your attention</p>
      </div>
      <OwnerActionCenter items={data.actionCenter} />
      <OwnerDocumentReminders reminders={data.documentReminders} />
    </div>
  );
}
