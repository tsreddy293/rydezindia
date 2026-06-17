"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveOwnerVehicle, rejectOwnerVehicle, requestVehicleReupload } from "@/server/actions/vehicles";
import { setVehicleEnabled } from "@/server/actions/marketplaceAdmin";

interface VehicleRow {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_number: string;
  status: string;
  vehicle_approval_status: string;
  owner_id: string;
}

interface DocRow {
  document_type: string;
  document_url: string;
}

interface Props {
  vehicles: VehicleRow[];
  documentsByVehicle: Record<string, DocRow[]>;
}

export default function AdminVehiclesClient({ vehicles, documentsByVehicle }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  async function runAction(id: string, action: "approve" | "reject" | "reupload" | "toggle", status?: string) {
    setBusy(id);
    const reason = reasons[id]?.trim() || "Please update your vehicle documents.";
    if (action === "approve") await approveOwnerVehicle(id);
    else if (action === "reject") await rejectOwnerVehicle(id, reason);
    else if (action === "reupload") await requestVehicleReupload(id, reason);
    else if (action === "toggle") await setVehicleEnabled("vehicles", id, status !== "available");
    router.refresh();
    setBusy(null);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3 font-medium">Vehicle</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Number</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Approval</th>
            <th className="px-4 py-3 font-medium">Documents</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {vehicles.map((vehicle) => {
            const docs = documentsByVehicle[vehicle.id] ?? [];
            return (
              <tr key={vehicle.id} className="align-top">
                <td className="px-4 py-4 font-medium text-secondary">{vehicle.vehicle_name}</td>
                <td className="px-4 py-4">{vehicle.vehicle_type}</td>
                <td className="px-4 py-4">{vehicle.vehicle_number}</td>
                <td className="px-4 py-4">{vehicle.status}</td>
                <td className="px-4 py-4">{vehicle.vehicle_approval_status}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {docs.length === 0 ? (
                      <span className="text-xs text-gray-400">No docs</span>
                    ) : (
                      docs.map((doc) => (
                        <a key={doc.document_type} href={doc.document_url} target="_blank" rel="noopener" className="text-xs text-primary underline">
                          {doc.document_type}
                        </a>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 min-w-[220px]">
                  <textarea
                    placeholder="Remarks / rejection reason"
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
                    <button
                      type="button"
                      disabled={busy === vehicle.id}
                      onClick={() => runAction(vehicle.id, "reupload")}
                      className="rounded-lg border px-3 py-1 text-xs text-amber-700 hover:bg-amber-50"
                    >
                      Request Re-upload
                    </button>
                    <button
                      type="button"
                      disabled={busy === vehicle.id}
                      onClick={() => runAction(vehicle.id, "toggle", vehicle.status)}
                      className="rounded-lg border px-3 py-1 text-xs text-secondary hover:bg-gray-50"
                    >
                      {vehicle.status === "available" ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
