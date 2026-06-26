import Button from "@/components/ui/Button";
import { getSavedVehicles } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Saved Vehicles",
  description: "Your saved and favourite vehicles on Rydez India.",
  path: "/dashboard/saved",
  noIndex: true,
});

export default async function SavedVehiclesPage() {
  const { user } = await requireRole("user");
  const saved = await getSavedVehicles(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Saved Vehicles</h1>
        <p className="mt-1 text-sm text-gray-500">Your favourite vehicles for quick booking</p>
      </div>
      {saved.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 py-16 text-center text-gray-500">
          No saved vehicles yet.
          <div className="mt-4">
            <Button href="/search" variant="primary" size="sm">
              Browse Vehicles
            </Button>
          </div>
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
                <Button
                  href={`/vehicle/${row.listing_id ?? row.vehicle_id}`}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  View
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
