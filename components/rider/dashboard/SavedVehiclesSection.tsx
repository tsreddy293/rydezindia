import Link from "next/link";
import type { RiderSavedVehicle } from "@/lib/rider/dashboard-types";

export default function SavedVehiclesSection({ vehicles }: { vehicles: RiderSavedVehicle[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-secondary">Saved Vehicles</h2>
        <Link href="/dashboard/saved" className="text-sm font-medium text-primary hover:underline">
          View All
        </Link>
      </div>
      {vehicles.length === 0 ? (
        <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
          Save vehicles while browsing to find them quickly.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vehicle/${v.listingId ?? v.vehicleId}`}
              className="rounded-xl border border-gray-100 p-4 transition-shadow hover:shadow-md"
            >
              <p className="font-semibold text-secondary">{v.name}</p>
              <p className="text-sm text-gray-500">{v.type}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
