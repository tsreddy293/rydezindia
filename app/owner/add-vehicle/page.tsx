import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import VehicleListingForm from "@/components/forms/VehicleListingForm";
import VehiclesTableSetupBanner from "@/components/owner/VehiclesTableSetupBanner";
import { ownerCreateVehicleBlockedReason } from "@/lib/admin/marketplace-gates";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerKycStatus } from "@/server/actions/ownerKyc";
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
  const [tableReady, kyc] = await Promise.all([isVehiclesTableReady(), getOwnerKycStatus()]);
  const kycBlocked = ownerCreateVehicleBlockedReason(kyc.status);
  const migrationSql = tableReady ? "" : getVehiclesMigrationSql();
  const dashboardUrl = getSupabaseDashboardUrl();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        {kycBlocked && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {kycBlocked}{" "}
            <a href="/owner/kyc" className="font-medium underline">
              Go to KYC
            </a>
          </div>
        )}
        {!tableReady && (
          <VehiclesTableSetupBanner sql={migrationSql} projectUrl={dashboardUrl} />
        )}
        <VehicleListingForm disabled={!tableReady || Boolean(kycBlocked)} />
      </div>
    </PageLayout>
  );
}
