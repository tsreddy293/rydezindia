import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { updateKycStatus } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  await requireRole("admin");
  const rows = await getAdminRows("owner_kyc", "id, owner_id, aadhaar_url, pan_url, license_url, rc_url, insurance_url, status, remarks, created_at", 100);

  return (
    <AdminPageShell title="KYC Management" description="Review owner document submissions">
      <AdminTable
        headers={["Owner", "Documents", "Status", "Remarks", "Actions"]}
        rows={rows.map((row) => [
          String(row.owner_id ?? "-"),
          <div key="docs" className="space-y-1 text-xs">
            {["aadhaar_url", "pan_url", "license_url", "rc_url", "insurance_url"].map((key) => (
              row[key] ? <a key={key} href={String(row[key])} className="block text-primary" target="_blank">View {key.replace("_url", "")}</a> : null
            ))}
          </div>,
          String(row.status ?? "pending"),
          String(row.remarks ?? "-"),
          <div key="actions" className="flex gap-2">
            <form action={async () => {
              "use server";
              await updateKycStatus(String(row.id), "approved");
            }}>
              <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">Approve</button>
            </form>
            <form action={async () => {
              "use server";
              await updateKycStatus(String(row.id), "rejected", "Rejected by admin");
            }}>
              <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">Reject</button>
            </form>
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
