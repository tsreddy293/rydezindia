import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminVehicleDocumentList } from "@/lib/supabase/queries";
import { approveVehicleDocument } from "@/server/actions/phase2Admin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return <span className="text-xs text-gray-400">Not uploaded</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-primary underline"
    >
      {label}
    </a>
  );
}

export default async function AdminDocumentsPage() {
  await requireRole("admin");
  const rows = await getAdminVehicleDocumentList(100);

  return (
    <AdminPageShell
      title="Vehicle Documents"
      description="Verify RC, insurance, pollution, and fitness certificates from vehicle submissions"
    >
      <AdminTable
        headers={[
          "Vehicle",
          "Registration",
          "Owner",
          "RC",
          "Insurance",
          "Pollution",
          "Fitness",
          "Verification Status",
          "Actions",
        ]}
        rows={rows.map((row) => [
          row.vehicle_name,
          row.registration_number || "-",
          row.owner_name,
          <DocLink key="rc" url={row.rc_url} label="View RC" />,
          <DocLink key="insurance" url={row.insurance_url} label="View Insurance" />,
          <DocLink key="pollution" url={row.pollution_url} label="View PUC" />,
          <DocLink key="fitness" url={row.fitness_url} label="View Fitness" />,
          row.verification_status,
          <div key="actions" className="flex flex-wrap gap-2">
            {(row.rc_url || row.insurance_url) && (
              <a
                href={row.rc_url ?? row.insurance_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border px-3 py-1 text-xs text-primary hover:bg-primary/5"
              >
                View
              </a>
            )}
            {row.verification_status === "pending" ? (
              <>
                <form
                  action={async () => {
                    "use server";
                    await approveVehicleDocument(row.id, true);
                  }}
                >
                  <button className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50">
                    Approve
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await approveVehicleDocument(row.id, false, "Documents rejected by admin");
                  }}
                >
                  <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                    Reject
                  </button>
                </form>
              </>
            ) : (
              <span className="text-xs text-gray-500 capitalize">{row.verification_status}</span>
            )}
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
