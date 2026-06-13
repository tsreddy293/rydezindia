import { CarTaxiFront } from "lucide-react";
import Link from "next/link";
import MarketplaceVehicleForm from "@/components/forms/MarketplaceVehicleForm";
import PageLayout from "@/components/layout/PageLayout";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { createPageMetadata } from "@/lib/metadata";
import { getVehicleOwners } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Register Vehicle With Driver",
  description: "Register a vehicle with driver for local, outstation, and airport trips on Rydez India.",
  path: "/vehicles/driver",
});

export default async function DriverVehiclePage() {
  await requireRole("owner");
  const { data: owners, error } = await getVehicleOwners();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <CarTaxiFront className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Register Vehicle With Driver</h1>
          <p className="text-gray-600 mt-2">Add driver details, base location, and package pricing.</p>
        </div>

        {error ? (
          <SupabaseErrorBanner message={error} />
        ) : owners.length === 0 ? (
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-8 text-center">
            <p className="text-gray-700 mb-4">No vehicle owners found. Please register as an owner first.</p>
            <Link
              href="/owner"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-6 py-3 font-medium hover:bg-primary-dark transition"
            >
              Register as Owner
            </Link>
          </div>
        ) : (
          <MarketplaceVehicleForm owners={owners} mode="with_driver" />
        )}
      </div>
    </PageLayout>
  );
}
