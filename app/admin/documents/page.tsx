import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminDocumentsClient from "@/components/admin/AdminDocumentsClient";
import { getAdminVehicleDocumentList } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireRole("admin");
  const rows = await getAdminVehicleDocumentList(100);

  return (
    <AdminPageShell
      title="Vehicle Documents"
      description="Verify RC and insurance — requires owner KYC approval first"
    >
      <AdminDocumentsClient rows={rows} />
    </AdminPageShell>
  );
}
