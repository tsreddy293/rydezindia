import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { createAdminClient } from "@/lib/supabase/admin";
import { approveVehicleDocument } from "@/server/actions/phase2Admin";
import { requireRole } from "@/server/actions/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  await requireRole("admin");
  const db = createAdminClient();
  const { data: docs } = await db
    .from("vehicle_documents")
    .select("*, vehicles(vehicle_name, vehicle_number, owner_id)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = docs ?? [];

  return (
    <AdminPageShell title="Vehicle Documents" description="Verify RC, insurance, pollution, and fitness certificates">
      <AdminTable
        headers={["Vehicle", "Type", "Expiry", "Verified", "Document", "Actions"]}
        rows={rows.map((row) => {
          const r = row as Record<string, unknown>;
          const vehicle = r.vehicles as Record<string, unknown> | null;
          return [
            String(vehicle?.vehicle_name ?? vehicle?.vehicle_number ?? "-"),
            String(r.document_type),
            r.expiry_date ? formatDate(String(r.expiry_date)) : "—",
            r.verified ? "Yes" : "No",
            r.document_url ? <a key="doc" href={String(r.document_url)} target="_blank" rel="noopener" className="text-primary text-xs">View</a> : "—",
            <div key="actions" className="flex gap-2">
              <form action={async () => { "use server"; await approveVehicleDocument(String(r.id), true); }}>
                <button className="rounded-lg border px-3 py-1 text-xs">Approve</button>
              </form>
              <form action={async () => { "use server"; await approveVehicleDocument(String(r.id), false, "Invalid document"); }}>
                <button className="rounded-lg border px-3 py-1 text-xs text-red-600">Reject</button>
              </form>
            </div>,
          ];
        })}
      />
    </AdminPageShell>
  );
}
