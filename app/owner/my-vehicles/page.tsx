import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import OwnerVehiclesList from "@/components/owner/OwnerVehiclesList";
import Button from "@/components/ui/Button";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";
import { Plus } from "lucide-react";

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
            <p className="text-gray-600">
              {vehicles.length} vehicle(s) · Submit → Admin approval → Searchable
            </p>
          </div>
          <Button href="/owner/add-vehicle" variant="primary">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
        <OwnerVehiclesList vehicles={vehicles} />
      </div>
    </PageLayout>
  );
}
