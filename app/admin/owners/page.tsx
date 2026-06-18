import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminOwnerList } from "@/lib/supabase/queries";
import { updateOwnerStatus } from "@/server/actions/marketplaceAdmin";
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
          owner.status,
          <div key="actions" className="flex flex-wrap gap-2">
            {(["approved", "rejected", "pending"] as const).map((status) => (
              <form
                key={status}
                action={async () => {
                  "use server";
                  await updateOwnerStatus(owner.id, status);
                }}
              >
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
