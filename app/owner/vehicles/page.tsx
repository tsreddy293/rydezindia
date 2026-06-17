import Link from "next/link";
import { Car, Edit, Plus } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import Button from "@/components/ui/Button";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { createPageMetadata } from "@/lib/metadata";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Vehicles",
  description: "Manage your registered vehicles on Rydez India.",
  path: "/owner/vehicles",
  noIndex: true,
});

export default async function OwnerVehiclesPage() {
  const { user } = await requireRole("owner");
  const vehicles = await getOwnerVehiclesList(user.id);

  return (
    <PageLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary">My Vehicles</h1>
            <p className="text-gray-600">{vehicles.length} vehicle(s) registered</p>
          </div>
          <Button href="/owner/add-vehicle" variant="primary">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 py-20 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No vehicles registered yet</p>
            <Button href="/owner/add-vehicle" variant="primary">Add Your First Vehicle</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const v = vehicle as Record<string, unknown>;
              const status = String(v.vehicle_approval_status ?? v.status ?? "pending");
              const photos = Array.isArray(v.photos) ? (v.photos as string[]) : [];
              return (
                <div key={String(v.id)} className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                  <div className="h-36 bg-gradient-to-br from-secondary to-primary">
                    {photos[0] ? (
                      <img src={photos[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Car className="h-12 w-12 text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-secondary">{String(v.vehicle_name)}</h3>
                        <p className="text-sm text-gray-500">{String(v.vehicle_number)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "approved" ? "bg-green-100 text-green-700" :
                        status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {String(v.vehicle_type)} · {String(v.seats)} seats · {v.has_ac !== false ? "AC" : "Non AC"}
                    </p>
                    <Link
                      href={`/owner/edit-vehicle/${v.id}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Edit className="h-4 w-4" /> Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
