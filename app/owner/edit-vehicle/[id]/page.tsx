import { notFound } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import OwnerDashboardNav from "@/components/dashboard/OwnerDashboardNav";
import VehicleListingForm from "@/components/forms/VehicleListingForm";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehicleById } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Edit Vehicle",
  description: "Update your vehicle details on Rydez India.",
  path: "/owner/edit-vehicle",
  noIndex: true,
});

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditVehiclePage({ params }: Props) {
  const { user } = await requireRole("owner");
  const { id } = await params;
  const vehicle = await getOwnerVehicleById(id, user.id);

  if (!vehicle) notFound();

  const v = vehicle as Record<string, unknown>;

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <OwnerDashboardNav />
        <VehicleListingForm
          vehicle={{
            id: String(v.id),
            vehicle_name: String(v.vehicle_name),
            vehicle_number: String(v.vehicle_number),
            vehicle_type: String(v.vehicle_type),
            fuel_type: v.fuel_type as string | null,
            transmission: v.transmission as string | null,
            seats: Number(v.seats),
            has_ac: v.has_ac !== false,
            images: vehicle.images,
            documents: vehicle.documents,
          }}
        />
      </div>
    </PageLayout>
  );
}
