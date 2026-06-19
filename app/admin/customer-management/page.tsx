import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminCustomerManagementClient from "@/components/admin/AdminCustomerManagementClient";
import { getAdminCustomerManagementList } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminCustomerManagementPage() {
  await requireRole("admin");
  const customers = await getAdminCustomerManagementList();

  return (
    <AdminPageShell
      title="Customer Management"
      description="Review customer KYC, approve accounts, and manage riders"
    >
      <AdminCustomerManagementClient customers={customers} />
    </AdminPageShell>
  );
}
