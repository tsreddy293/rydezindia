import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { createPageMetadata } from "@/lib/metadata";
import { getOwnerVehicleById } from "@/server/actions/vehicles";
import { requireRole } from "@/server/actions/auth";

const VehicleListingWizard = nextDynamic(() => import("@/components/owner/vehicles/VehicleListingWizard"), {
  loading: () => <div className="animate-pulse h-96 rounded-2xl bg-gray-100" />,
});

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary md:text-3xl">Edit Vehicle</h1>
        <p className="mt-1 text-sm text-gray-500">Update details via the listing wizard</p>
      </div>
      <VehicleListingWizard vehicle={vehicle} />
    </div>
  );
}
