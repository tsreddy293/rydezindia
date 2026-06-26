import nextDynamic from "next/dynamic";
import Button from "@/components/ui/Button";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerBookings, getOwnerEarnings } from "@/lib/supabase/queries";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";
import { Plus } from "lucide-react";

const OwnerVehiclesHub = nextDynamic(() => import("@/components/owner/vehicles/OwnerVehiclesHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Vehicles",
  description: "Manage your vehicles and track approval status on Rydez India.",
  path: "/owner/my-vehicles",
  noIndex: true,
});

export default async function OwnerMyVehiclesPage() {
  const { user } = await requireRole("owner");
  const [vehicles, bookings, earnings] = await Promise.all([
    getOwnerVehiclesList(user.id),
    getOwnerBookings(user.id),
    getOwnerEarnings(user.id),
  ]);

  const completedTrips = bookings.filter((b) => b.booking_status.toLowerCase() === "completed").length;
  const lifetimeEarnings = (earnings as Array<Record<string, unknown>>).reduce(
    (sum, r) => sum + Number(r.net_amount ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary md:text-3xl">My Vehicles</h1>
          <p className="text-gray-600">Central hub for fleet management — search, filter, and manage every vehicle</p>
        </div>
        <Button href="/owner/add-vehicle" variant="primary">
          <Plus className="h-4 w-4" />
          + Add Vehicle
        </Button>
      </div>
      <OwnerVehiclesHub vehicles={vehicles} completedTrips={completedTrips} lifetimeEarnings={lifetimeEarnings} />
    </div>
  );
}
