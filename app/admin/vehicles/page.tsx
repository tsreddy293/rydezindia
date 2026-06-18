import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminVehiclesClient from "@/components/admin/AdminVehiclesClient";
import { getAdminVehicleList } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const vehicles = await getAdminVehicleList(100);

  return (
    <AdminPageShell title="Vehicle Approval" description="Review and approve owner vehicle submissions">
      <AdminVehiclesClient vehicles={vehicles} />
    </AdminPageShell>
  );
}
