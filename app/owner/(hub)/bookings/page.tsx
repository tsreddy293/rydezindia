import nextDynamic from "next/dynamic";
import { mapOwnerBooking } from "@/lib/owner/booking-utils";
import { getOwnerBookings } from "@/lib/supabase/queries";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehiclesList } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";
import { vehicleDisplayName } from "@/lib/vehicles/format";

const OwnerBookingsHub = nextDynamic(() => import("@/components/owner/bookings/OwnerBookingsHub"), {
  loading: () => <div className="animate-pulse h-64 rounded-2xl bg-gray-100" />,
});

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "My Bookings",
  description: "View booking requests for your vehicles.",
  path: "/owner/bookings",
  noIndex: true,
});

export default async function OwnerBookingsPage() {
  const { user } = await requireRole("owner");
  const [bookingsRaw, vehicles] = await Promise.all([
    getOwnerBookings(user.id),
    getOwnerVehiclesList(user.id),
  ]);

  const bookings = bookingsRaw.map(mapOwnerBooking);
  const approvedVehicles = vehicles
    .filter((v) => v.approval_status === "approved")
    .map((v) => ({
      id: v.id,
      vehicle_name: vehicleDisplayName(v),
      vehicle_type: v.vehicle_category,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Booking Management</h1>
        <p className="mt-1 text-sm text-gray-500">{bookings.length} total · Return journey integrated</p>
      </div>
      <OwnerBookingsHub bookings={bookings} approvedVehicles={approvedVehicles} />
    </div>
  );
}
