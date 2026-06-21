import { notFound } from "next/navigation";
import { AdminPageShell } from "@/components/admin/AdminTable";
import AdminVehicleDetailClient from "@/components/admin/AdminVehicleDetailClient";
import { getAdminVehicleDetail } from "@/lib/supabase/queries";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminVehicleDetailPage({ params }: Props) {
  await requireRole("admin");
  const { id } = await params;
  const vehicle = await getAdminVehicleDetail(id);

  if (!vehicle) notFound();

  return (
    <AdminPageShell
      title="Vehicle Review"
      description={`${vehicle.vehicle_name} · ${vehicle.registration_number || "No registration"}`}
    >
      <AdminVehicleDetailClient vehicle={vehicle} />
    </AdminPageShell>
  );
}
