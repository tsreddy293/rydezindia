import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { getAuthAccounts } from "@/lib/services/auth-admin";
import { deleteUser, setUserBlocked } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("admin");
  const users = await getAdminRows("users", "id, name, full_name, email, mobile, role, is_blocked, created_at", 100);
  const authAccounts = await getAuthAccounts();
  const authMap = new Map(authAccounts.map((account) => [account.id, account]));

  return (
    <AdminPageShell title="User Management" description="View, block, unblock, and delete users">
      <AdminTable
        headers={["Name", "Email", "Mobile", "Role", "Verified", "Last Login", "Status", "Actions"]}
        rows={users.map((user) => {
          const auth = authMap.get(String(user.id));
          return [
            String(user.name ?? user.full_name ?? "User"),
            String(user.email ?? auth?.email ?? "-"),
          String(user.mobile ?? "-"),
          String(user.role ?? "user"),
          auth?.verified ? "Verified" : "Unverified",
          auth?.lastLogin ? new Date(auth.lastLogin).toLocaleString("en-IN") : "Never",
          user.is_blocked ? "Blocked" : "Active",
          <div key="actions" className="flex flex-wrap gap-2">
            <form action={async () => {
              "use server";
              await setUserBlocked(String(user.id), !user.is_blocked);
            }}>
              <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">
                {user.is_blocked ? "Unblock" : "Block"}
              </button>
            </form>
            <form action={async () => {
              "use server";
              await deleteUser(String(user.id));
            }}>
              <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                Delete
              </button>
            </form>
          </div>,
        ];
        })}
      />
    </AdminPageShell>
  );
}
