import nextDynamic from "next/dynamic";
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

const VehicleListingWizard = nextDynamic(() => import("@/components/owner/vehicles/VehicleListingWizard"), {
  loading: () => <div className="animate-pulse h-96 rounded-2xl bg-gray-100" />,
});

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Add Vehicle</h1>
        <p className="mt-1 text-sm text-gray-500">7-step wizard — details, photos, documents, pricing & more</p>
      </div>
      {kycBlocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {kycBlocked}{" "}
          <a href="/owner/kyc" className="font-medium underline">Go to KYC</a>
        </div>
      )}
      {!tableReady && <VehiclesTableSetupBanner sql={migrationSql} projectUrl={dashboardUrl} />}
      <VehicleListingWizard disabled={!tableReady || Boolean(kycBlocked)} />
    </div>
  );
}
