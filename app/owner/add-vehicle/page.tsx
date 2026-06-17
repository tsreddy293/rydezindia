import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import VehicleListingForm from "@/components/forms/VehicleListingForm";
import VehiclesTableSetupBanner from "@/components/owner/VehiclesTableSetupBanner";
import { createPageMetadata } from "@/lib/metadata";
import {
  getSupabaseDashboardUrl,
  getVehiclesMigrationSql,
  isVehiclesTableReady,
} from "@/lib/supabase/vehicles-table-setup";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Add Vehicle",
  description: "Register a new vehicle on Rydez India.",
  path: "/owner/add-vehicle",
  noIndex: true,
});

export default async function AddVehiclePage() {
  await requireRole("owner");
  const tableReady = await isVehiclesTableReady();
  const migrationSql = tableReady ? "" : getVehiclesMigrationSql();
  const dashboardUrl = getSupabaseDashboardUrl();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        {!tableReady && (
          <VehiclesTableSetupBanner sql={migrationSql} projectUrl={dashboardUrl} />
        )}
        <VehicleListingForm disabled={!tableReady} />
      </div>
    </PageLayout>
  );
}
