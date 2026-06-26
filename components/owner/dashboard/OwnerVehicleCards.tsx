import Link from "next/link";
import { Car, Edit, Eye, MapPin } from "lucide-react";
import type { OwnerDashboardVehicle } from "@/lib/owner/dashboard-types";
import { OWNER_STATUS_STYLES, resolveVehicleStatusKind } from "@/lib/owner/owner-status-styles";
import { formatINR } from "@/lib/utils";
import OwnerEmptyState from "@/components/owner/dashboard/ui/OwnerEmptyState";
import OwnerSection from "@/components/owner/dashboard/ui/OwnerSection";

export default function OwnerVehicleCards({ vehicles }: { vehicles: OwnerDashboardVehicle[] }) {
  return (
    <OwnerSection
      title="Vehicle Management"
      description="Your fleet overview"
      action={
        <Link href="/owner/my-vehicles" className="text-sm font-semibold text-primary hover:underline">
          Manage all →
        </Link>
      }
    >
      {vehicles.length === 0 ? (
        <OwnerEmptyState
          icon={Car}
          title="No Vehicles Added"
          description="Add your first vehicle to start earning on Rydez India."
          actionLabel="Go to My Vehicles"
          actionHref="/owner/my-vehicles"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.slice(0, 6).map((v) => {
            const kind = resolveVehicleStatusKind(v.status, v.isActive);
            const availability = kind === "active" ? "Available" : kind === "booked" ? "Booked" : "Unavailable";
            return (
              <article
                key={v.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-40 bg-gradient-to-br from-secondary/90 to-primary/90">
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt={v.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-12 w-12 text-white/30" />
                    </div>
                  )}
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ring-inset ${OWNER_STATUS_STYLES[kind]}`}>
                    {kind}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-secondary">{v.name}</h3>
                  <p className="text-xs text-gray-500">{v.registrationNumber}</p>
                  <p className="mt-1 text-sm text-gray-600">{v.category}</p>
                  {v.city && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {v.city}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {v.dailyFare != null && (
                      <p className="font-bold text-primary">{formatINR(v.dailyFare)}<span className="text-xs font-normal text-gray-500">/day</span></p>
                    )}
                    <span className="text-xs font-medium text-gray-500">{availability}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs font-semibold">
                    <Link href={`/owner/view-vehicle/${v.id}`} className="inline-flex items-center gap-1 text-secondary hover:text-primary">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                    {v.status !== "approved" && (
                      <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 text-primary">
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </OwnerSection>
  );
}
