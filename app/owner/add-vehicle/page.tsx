import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import VehicleListingForm from "@/components/forms/VehicleListingForm";
import { createPageMetadata } from "@/lib/metadata";
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

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <VehicleListingForm />
      </div>
    </PageLayout>
  );
}
