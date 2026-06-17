import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminVehiclesClient from "@/components/admin/AdminVehiclesClient";
import { getAdminRows } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";
import { mapVehicleRow, vehicleDisplayName } from "@/lib/vehicles/format";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  await requireRole("admin");
  const vehicles = await getAdminRows(
    "vehicles",
    "id, owner_id, vehicle_make, vehicle_model, vehicle_year, registration_number, vehicle_category, vehicle_photo_url, rc_document_url, insurance_document_url, approval_status, created_at",
    100
  );

  return (
    <AdminPageShell title="Vehicle Approval" description="Review and approve owner vehicle submissions">
      <AdminVehiclesClient
        vehicles={vehicles.map((v) => {
          const row = mapVehicleRow(v as Record<string, unknown>);
          return {
            id: row.id,
            vehicle_name: vehicleDisplayName(row),
            vehicle_category: row.vehicle_category,
            registration_number: row.registration_number,
            approval_status: row.approval_status,
            owner_id: row.owner_id,
            vehicle_photo_url: row.vehicle_photo_url ?? null,
            rc_document_url: row.rc_document_url ?? null,
            insurance_document_url: row.insurance_document_url ?? null,
          };
        })}
      />
    </AdminPageShell>
  );
}
