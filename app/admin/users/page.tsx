import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminUserList } from "@/lib/supabase/queries";
import { roleLabel } from "@/lib/auth/roles";
import { deleteUser, setUserBlocked } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("admin");
  const users = await getAdminUserList(500);

  return (
    <AdminPageShell title="User Management" description="View, block, unblock, and delete users">
      <AdminTable
        headers={["Name", "Email", "Mobile", "Role", "Verified", "Last Login", "Status", "Actions"]}
        rows={users.map((user) => [
          user.name,
          user.email || "-",
          user.mobile || "-",
          roleLabel(user.role),
          user.verified ? "Verified" : "Unverified",
          user.lastLogin ? new Date(user.lastLogin).toLocaleString("en-IN") : "Never",
          user.status,
          <div key="actions" className="flex flex-wrap gap-2">
            <form
              action={async () => {
                "use server";
                await setUserBlocked(user.id, !user.is_blocked);
              }}
            >
              <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">
                {user.is_blocked ? "Unblock" : "Block"}
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteUser(user.id);
              }}
            >
              <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                Delete
              </button>
            </form>
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
