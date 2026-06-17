"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Edit, Eye, Loader2, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import VehicleStatusBadge from "@/components/owner/VehicleStatusBadge";
import { deleteOwnerVehicle } from "@/server/actions/vehicles";
import { vehicleDisplayName, type OwnerVehicleRow } from "@/lib/vehicles/format";

interface Props {
  vehicles: OwnerVehicleRow[];
}

export default function OwnerVehiclesList({ vehicles }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setError("");
    const result = await deleteOwnerVehicle(id);
    if (result.success) router.refresh();
    else setError(result.error ?? "Failed to delete vehicle");
    setDeletingId(null);
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 py-20 text-center">
        <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No vehicles yet. Add your first vehicle to get started.</p>
        <Button href="/owner/add-vehicle" variant="primary">Add Your First Vehicle</Button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => {
          const displayName = vehicleDisplayName(v);
          const canDelete = v.approval_status !== "approved";
          const canEdit = v.approval_status !== "approved";

          return (
            <article key={v.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="h-44 bg-gradient-to-br from-secondary to-primary">
                {v.vehicle_photo_url ? (
                  <img src={v.vehicle_photo_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-12 w-12 text-white/30" />
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-secondary">{displayName}</h3>
                    <p className="text-sm text-gray-500">{v.registration_number}</p>
                  </div>
                  <VehicleStatusBadge status={v.approval_status} />
                </div>
                <p className="text-sm text-gray-600 mb-4">{v.vehicle_category}</p>
                <div className="mt-auto flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <Link href={`/owner/view-vehicle/${v.id}`} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary">
                    <Eye className="h-4 w-4" /> View
                  </Link>
                  {canEdit && (
                    <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Edit className="h-4 w-4" /> Edit
                    </Link>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id, displayName)}
                      disabled={deletingId === v.id}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                    >
                      {deletingId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
