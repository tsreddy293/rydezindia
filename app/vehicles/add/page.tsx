import { Car } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import VehicleRegistrationForm from "@/components/forms/VehicleRegistrationForm";
import SupabaseErrorBanner from "@/components/ui/SupabaseErrorBanner";
import { getVehicleOwners } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Vehicle",
  description: "Register a new vehicle on Rydez India",
};

export default async function AddVehiclePage() {
  const { data: owners, error } = await getVehicleOwners();

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Register Vehicle</h1>
          <p className="text-gray-600 mt-2">Add a vehicle route to the Rydez India platform</p>
        </div>

        {error ? (
          <SupabaseErrorBanner message={error} />
        ) : owners.length === 0 ? (
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-8 text-center">
            <p className="text-gray-700 mb-4">
              No vehicle owners found. Please register as an owner first.
            </p>
            <a
              href="/owner"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-white px-6 py-3 font-medium hover:bg-primary-dark transition"
            >
              Register as Owner
            </a>
          </div>
        ) : (
          <VehicleRegistrationForm owners={owners} />
        )}
      </div>
    </PageLayout>
  );
}
