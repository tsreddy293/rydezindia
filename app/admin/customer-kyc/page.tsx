import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { listCustomerKyc } from "@/lib/services/customer-kyc";
import { updateCustomerKycStatus, requestKycReupload } from "@/server/actions/phase2Admin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminCustomerKycPage() {
  await requireRole("admin");
  const rows = await listCustomerKyc();

  return (
    <AdminPageShell title="Customer KYC" description="Review customer identity documents">
      <AdminTable
        headers={["User", "Documents", "Status", "Remarks", "Actions"]}
        rows={rows.map((row) => {
          const r = row as Record<string, unknown>;
          return [
            String(r.user_id ?? "-"),
            <div key="docs" className="space-y-1 text-xs">
              {r.aadhaar_url ? <a href={String(r.aadhaar_url)} target="_blank" rel="noopener" className="block text-primary">Aadhaar</a> : null}
              {r.license_url ? <a href={String(r.license_url)} target="_blank" rel="noopener" className="block text-primary">License</a> : null}
              {r.selfie_url ? <a href={String(r.selfie_url)} target="_blank" rel="noopener" className="block text-primary">Selfie</a> : null}
            </div>,
            String(r.status ?? "pending"),
            String(r.remarks ?? "-"),
            <div key="actions" className="flex flex-wrap gap-2">
              <form action={async () => { "use server"; await updateCustomerKycStatus(String(r.id), "verified"); }}>
                <button className="rounded-lg border px-3 py-1 text-xs">Approve</button>
              </form>
              <form action={async () => { "use server"; await updateCustomerKycStatus(String(r.id), "rejected", "Rejected"); }}>
                <button className="rounded-lg border px-3 py-1 text-xs text-red-600">Reject</button>
              </form>
              <form action={async () => { "use server"; await requestKycReupload("customer_kyc", String(r.id), "Please re-upload clearer documents"); }}>
                <button className="rounded-lg border px-3 py-1 text-xs">Re-upload</button>
              </form>
            </div>,
          ];
        })}
      />
    </AdminPageShell>
  );
}
