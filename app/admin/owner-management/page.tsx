import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminOwnerManagementClient from "@/components/admin/AdminOwnerManagementClient";
import { getAdminOwnerManagementList } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminOwnerManagementPage() {
  await requireRole("admin");
  const owners = await getAdminOwnerManagementList();

  return (
    <AdminPageShell
      title="Owner Management"
      description="Review owner KYC, approve owners, and manage vehicles — all in one place"
    >
      <AdminOwnerManagementClient owners={owners} />
    </AdminPageShell>
  );
}
