import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { updateOwnerStatus } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminOwnersPage() {
  await requireRole("admin");
  const owners = await getAdminRows("owners", "id, owner_name, mobile, email, verification_status, created_at", 100);

  return (
    <AdminPageShell title="Owner Management" description="Approve, reject, or review owners">
      <AdminTable
        headers={["Owner", "Email", "Mobile", "Status", "Actions"]}
        rows={owners.map((owner) => [
          String(owner.owner_name ?? "Owner"),
          String(owner.email ?? "-"),
          String(owner.mobile ?? "-"),
          String(owner.verification_status ?? "pending"),
          <div key="actions" className="flex flex-wrap gap-2">
            {(["approved", "rejected", "pending"] as const).map((status) => (
              <form key={status} action={async () => {
                "use server";
                await updateOwnerStatus(String(owner.id), status);
              }}>
                <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">
                  {status}
                </button>
              </form>
            ))}
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
