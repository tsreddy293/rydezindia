import PageLayout from "@/components/layout/PageLayout";
import UserDashboardNav from "@/components/dashboard/UserDashboardNav";
import Button from "@/components/ui/Button";
import { getSavedVehicles } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Saved Vehicles",
  description: "Your saved and favourite vehicles on Rydez India.",
  path: "/user/saved",
  noIndex: true,
});

export default async function SavedVehiclesPage() {
  const { user } = await requireRole("user");
  const saved = await getSavedVehicles(user.id);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <UserDashboardNav />
        <h1 className="text-3xl font-bold text-secondary mb-8">Saved Vehicles</h1>
        {saved.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-gray-50 text-gray-500">
            No saved vehicles yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((item) => {
              const row = item as Record<string, unknown>;
              const vehicle = row.vehicles as Record<string, unknown> | null;
              return (
                <div key={String(row.id)} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">{String(vehicle?.vehicle_name ?? "Vehicle")}</h3>
                  <p className="text-sm text-gray-500">{String(vehicle?.vehicle_type ?? "")}</p>
                  <Button href={`/vehicle/${row.listing_id ?? row.vehicle_id}`} variant="outline" size="sm" className="mt-3">
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
