"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveOwnerVehicle, rejectOwnerVehicle } from "@/server/actions/vehicles";

interface VehicleRow {
  id: string;
  vehicle_name: string;
  vehicle_category: string;
  registration_number: string;
  approval_status: string;
  owner_id: string;
  vehicle_photo_url: string | null;
  rc_document_url: string | null;
  insurance_document_url: string | null;
}

interface Props {
  vehicles: VehicleRow[];
}

export default function AdminVehiclesClient({ vehicles }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function runAction(id: string, action: "approve" | "reject") {
    setBusy(id);
    const reason = reasons[id]?.trim() || "Rejected by admin";
    if (action === "approve") await approveOwnerVehicle(id);
    else await rejectOwnerVehicle(id, reason);
    router.refresh();
    setBusy(null);
  }

  if (vehicles.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-12 text-center text-gray-500 shadow-sm">
        No vehicles submitted yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">Vehicle</th>
            <th className="px-4 py-3 font-medium">Registration</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Documents</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="align-top">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {vehicle.vehicle_photo_url ? (
                    <img src={vehicle.vehicle_photo_url} alt="" className="h-12 w-16 rounded-lg object-cover border" />
                  ) : null}
                  <span className="font-medium text-secondary">{vehicle.vehicle_name}</span>
                </div>
              </td>
              <td className="px-4 py-4">{vehicle.registration_number}</td>
              <td className="px-4 py-4">{vehicle.vehicle_category}</td>
              <td className="px-4 py-4 capitalize">{vehicle.approval_status}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {vehicle.rc_document_url ? (
                    <a href={vehicle.rc_document_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                      RC
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">No RC</span>
                  )}
                  {vehicle.insurance_document_url ? (
                    <a href={vehicle.insurance_document_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                      Insurance
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">No insurance</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 min-w-[200px]">
                <textarea
                  placeholder="Rejection reason (optional)"
                  value={reasons[vehicle.id] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [vehicle.id]: e.target.value }))}
                  className="mb-2 w-full rounded-lg border px-2 py-1 text-xs"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === vehicle.id}
                    onClick={() => runAction(vehicle.id, "approve")}
                    className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === vehicle.id}
                    onClick={() => runAction(vehicle.id, "reject")}
                    className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
