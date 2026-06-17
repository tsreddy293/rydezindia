"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, Edit, Loader2, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import VehicleStatusBadge from "@/components/owner/VehicleStatusBadge";
import { submitOwnerVehicleForApproval } from "@/server/actions/vehicles";

interface VehicleRow {
  id: string;
  vehicle_name: string;
  vehicle_number: string;
  vehicle_type: string;
  seats: number;
  has_ac?: boolean;
  rate_per_km?: number;
  photos?: string[];
  vehicle_approval_status?: string;
  rejection_reason?: string | null;
  reupload_requested?: boolean;
  reupload_reason?: string | null;
}

interface Props {
  vehicles: VehicleRow[];
}

export default function OwnerVehiclesList({ vehicles }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(id: string) {
    setLoadingId(id);
    setError("");
    const result = await submitOwnerVehicleForApproval(id);
    if (result.success) router.refresh();
    else setError(result.error ?? "Failed to submit");
    setLoadingId(null);
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 py-20 text-center">
        <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">No vehicles yet. Start your onboarding by adding a vehicle.</p>
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
          const status = String(v.vehicle_approval_status ?? "draft");
          const photos = Array.isArray(v.photos) ? v.photos : [];
          const canSubmit = status === "draft" || status === "rejected" || v.reupload_requested;
          return (
            <article key={v.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="h-40 bg-gradient-to-br from-secondary to-primary">
                {photos[0] ? (
                  <img src={photos[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Car className="h-12 w-12 text-white/30" />
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-secondary">{v.vehicle_name}</h3>
                    <p className="text-sm text-gray-500">{v.vehicle_number}</p>
                  </div>
                  <VehicleStatusBadge status={status} reuploadRequested={v.reupload_requested} />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {v.vehicle_type} · {v.seats} seats · {v.has_ac !== false ? "AC" : "Non AC"}
                  {v.rate_per_km ? ` · ₹${v.rate_per_km}/km` : ""}
                </p>
                {v.rejection_reason && (
                  <p className="text-xs text-red-600 mb-2">Rejected: {v.rejection_reason}</p>
                )}
                {v.reupload_reason && (
                  <p className="text-xs text-amber-700 mb-2">{v.reupload_reason}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Link href={`/owner/edit-vehicle/${v.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <Edit className="h-4 w-4" /> Edit
                  </Link>
                  {canSubmit && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(v.id)}
                      disabled={loadingId === v.id}
                      className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
                    >
                      {loadingId === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit for Approval
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
