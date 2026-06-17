import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Car, ExternalLink } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import Button from "@/components/ui/Button";
import VehicleStatusBadge from "@/components/owner/VehicleStatusBadge";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehicleById } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";
import { vehicleDisplayName } from "@/lib/vehicles/format";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "View Vehicle",
  description: "View your vehicle details on Rydez India.",
  path: "/owner/view-vehicle",
  noIndex: true,
});

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ViewVehiclePage({ params }: Props) {
  const { user } = await requireRole("owner");
  const { id } = await params;
  const vehicle = await getOwnerVehicleById(id, user.id);

  if (!vehicle) notFound();

  const displayName = vehicleDisplayName(vehicle);

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />

        <Link href="/owner/my-vehicles" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to My Vehicles
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="h-56 bg-gradient-to-br from-secondary to-primary">
            {vehicle.vehicle_photo_url ? (
              <img src={vehicle.vehicle_photo_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Car className="h-16 w-16 text-white/30" />
              </div>
            )}
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-secondary">{displayName}</h1>
                <p className="text-gray-500 mt-1">{vehicle.registration_number}</p>
              </div>
              <VehicleStatusBadge status={vehicle.approval_status} />
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Category</dt>
                <dd className="mt-1 font-semibold text-secondary">{vehicle.vehicle_category}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Year</dt>
                <dd className="mt-1 font-semibold text-secondary">{vehicle.vehicle_year}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Make</dt>
                <dd className="mt-1 font-semibold text-secondary">{vehicle.vehicle_make}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Model</dt>
                <dd className="mt-1 font-semibold text-secondary">{vehicle.vehicle_model}</dd>
              </div>
            </dl>

            <div className="border-t pt-6 space-y-3">
              <h2 className="font-semibold text-secondary">Documents</h2>
              <div className="flex flex-wrap gap-3">
                {vehicle.rc_document_url ? (
                  <a
                    href={vehicle.rc_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-primary/5"
                  >
                    RC Document <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">RC not uploaded</span>
                )}
                {vehicle.insurance_document_url ? (
                  <a
                    href={vehicle.insurance_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-primary/5"
                  >
                    Insurance <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">Insurance not uploaded</span>
                )}
              </div>
            </div>

            {vehicle.approval_status === "pending" && (
              <p className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                Your vehicle is waiting for admin approval.
              </p>
            )}

            {vehicle.approval_status !== "approved" && (
              <div className="flex flex-wrap gap-3 pt-2">
                <Button href={`/owner/edit-vehicle/${vehicle.id}`} variant="primary" size="sm">
                  Edit Vehicle
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
