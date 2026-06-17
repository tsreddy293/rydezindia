import { Plus } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import OwnerVehiclesList from "@/components/owner/OwnerVehiclesList";
import Button from "@/components/ui/Button";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Vehicles",
  description: "Manage your vehicles and track approval status on Rydez India.",
  path: "/owner/my-vehicles",
  noIndex: true,
});

export default async function OwnerMyVehiclesPage() {
  const { user } = await requireRole("owner");
  const vehicles = await getOwnerVehiclesList(user.id);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">My Vehicles</h1>
            <p className="text-gray-600">{vehicles.length} vehicle(s) · Draft → Submit → Admin approval → Searchable</p>
          </div>
          <Button href="/owner/add-vehicle" variant="primary">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
        <OwnerVehiclesList
          vehicles={vehicles.map((v) => {
            const row = v as Record<string, unknown>;
            return {
              id: String(row.id),
              vehicle_name: String(row.vehicle_name),
              vehicle_number: String(row.vehicle_number),
              vehicle_type: String(row.vehicle_type),
              seats: Number(row.seats ?? 0),
              has_ac: row.has_ac !== false,
              rate_per_km: Number(row.rate_per_km ?? 0) || undefined,
              photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
              vehicle_approval_status: String(row.vehicle_approval_status ?? row.status ?? "draft"),
              rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
              reupload_requested: Boolean(row.reupload_requested),
              reupload_reason: row.reupload_reason ? String(row.reupload_reason) : null,
            };
          })}
        />
      </div>
    </PageLayout>
  );
}
