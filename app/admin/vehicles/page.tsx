import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminVehiclesClient from "@/components/admin/AdminVehiclesClient";
import { getAdminRows, getVehicleDocumentsForAdmin } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const vehicles = await getAdminRows(
    "vehicles",
    "id, vehicle_name, vehicle_type, vehicle_number, status, vehicle_approval_status, owner_id, created_at",
    100
  );

  const documentsByVehicle: Record<string, { document_type: string; document_url: string }[]> = {};
  for (const vehicle of vehicles) {
    const id = String(vehicle.id);
    const docs = await getVehicleDocumentsForAdmin(id);
    documentsByVehicle[id] = docs.map((d) => ({
      document_type: String((d as { document_type: string }).document_type),
      document_url: String((d as { document_url: string }).document_url),
    }));
  }

  return (
    <AdminPageShell title="Vehicle Onboarding Review" description="Approve, reject, or request document re-upload">
      <AdminVehiclesClient
        vehicles={vehicles.map((v) => ({
          id: String(v.id),
          vehicle_name: String(v.vehicle_name ?? "Vehicle"),
          vehicle_type: String(v.vehicle_type ?? "-"),
          vehicle_number: String(v.vehicle_number ?? "-"),
          status: String(v.status ?? "draft"),
          vehicle_approval_status: String(v.vehicle_approval_status ?? "draft"),
          owner_id: String(v.owner_id ?? ""),
        }))}
        documentsByVehicle={documentsByVehicle}
      />
    </AdminPageShell>
  );
}
