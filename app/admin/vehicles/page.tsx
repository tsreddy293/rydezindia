import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows, getVehicleDocumentsForAdmin } from "@/lib/supabase/queries";
import { approveVehicle, rejectVehicle, setVehicleEnabled } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const vehicles = await getAdminRows(
    "vehicles",
    "id, vehicle_name, vehicle_type, vehicle_number, status, vehicle_approval_status, owner_id, created_at",
    100
  );

  const vehiclesWithDocs = await Promise.all(
    vehicles.map(async (vehicle) => ({
      vehicle,
      documents: await getVehicleDocumentsForAdmin(String(vehicle.id)),
    }))
  );

  return (
    <AdminPageShell title="Vehicle Management" description="Approve, reject, and review vehicle documents">
      <AdminTable
        headers={["Vehicle", "Type", "Number", "Status", "Approval", "Documents", "Actions"]}
        rows={vehiclesWithDocs.map(({ vehicle, documents }) => [
          String(vehicle.vehicle_name ?? "Vehicle"),
          String(vehicle.vehicle_type ?? "-"),
          String(vehicle.vehicle_number ?? "-"),
          String(vehicle.status ?? "pending"),
          String(vehicle.vehicle_approval_status ?? "pending"),
          documents.length > 0 ? (
            <div key="docs" className="flex flex-wrap gap-1">
              {documents.map((doc) => {
                const d = doc as { document_type: string; document_url: string };
                return (
                  <a
                    key={d.document_type}
                    href={d.document_url}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-primary underline"
                  >
                    {d.document_type}
                  </a>
                );
              })}
            </div>
          ) : (
            <span key="no-docs" className="text-xs text-gray-400">No docs</span>
          ),
          <div key="actions" className="flex flex-wrap gap-2">
            <form action={async () => {
              "use server";
              await approveVehicle("vehicles", String(vehicle.id));
            }}>
              <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">Approve</button>
            </form>
            <form action={async () => {
              "use server";
              await rejectVehicle("vehicles", String(vehicle.id), "Rejected by admin");
            }}>
              <button className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50">Reject</button>
            </form>
            <form action={async () => {
              "use server";
              await setVehicleEnabled("vehicles", String(vehicle.id), String(vehicle.status) !== "available");
            }}>
              <button className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50">
                {String(vehicle.status) === "available" ? "Disable" : "Enable"}
              </button>
            </form>
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
