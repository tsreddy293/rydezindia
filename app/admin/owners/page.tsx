import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import {
  AdminOwnerStatusActions,
  AdminOwnerStatusBadge,
} from "@/components/admin/AdminOwnerStatusCell";
import { getAdminOwnerList } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminOwnersPage() {
  await requireRole("admin");
  const owners = await getAdminOwnerList();

  return (
    <AdminPageShell title="Owner Management" description="Approve, reject, or review owners">
      <AdminTable
        headers={["Owner", "Email", "Mobile", "City", "Vehicles", "Status", "Actions"]}
        rows={owners.map((owner) => [
          owner.name,
          owner.email || "-",
          owner.mobile || "-",
          owner.city || "-",
          String(owner.vehicleCount),
          <AdminOwnerStatusBadge key="status" status={owner.status} />,
          <AdminOwnerStatusActions
            key="actions"
            ownerId={owner.id}
            currentStatus={owner.status}
          />,
        ])}
      />
    </AdminPageShell>
  );
}
