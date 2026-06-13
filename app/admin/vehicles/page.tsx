import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminRows } from "@/lib/supabase/queries";
import { approveVehicle, rejectVehicle, setVehicleEnabled } from "@/server/actions/marketplaceAdmin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const vehicles = await getAdminRows("vehicles", "id, vehicle_name, vehicle_type, vehicle_number, status, vehicle_approval_status, created_at", 100);

  return (
    <AdminPageShell title="Vehicle Management" description="Approve, reject, disable, and enable vehicles">
      <AdminTable
        headers={["Vehicle", "Type", "Number", "Status", "Approval", "Actions"]}
        rows={vehicles.map((vehicle) => [
          String(vehicle.vehicle_name ?? "Vehicle"),
          String(vehicle.vehicle_type ?? "-"),
          String(vehicle.vehicle_number ?? "-"),
          String(vehicle.status ?? "pending"),
          String(vehicle.vehicle_approval_status ?? "pending"),
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
