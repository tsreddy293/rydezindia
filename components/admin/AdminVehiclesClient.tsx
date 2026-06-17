"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveOwnerVehicle,
  rejectOwnerVehicle,
  updateVehicleServiceAvailability,
} from "@/server/actions/vehicles";
import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";

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
  service_self_drive: boolean;
  service_with_driver: boolean;
  service_local_rental: boolean;
  service_return_journey: boolean;
}

interface Props {
  vehicles: VehicleRow[];
}

function ServiceBadges({ services }: { services: VehicleServiceAvailability }) {
  const active = VEHICLE_SERVICES.filter((s) => services[s.key]);
  if (active.length === 0) {
    return <span className="text-xs text-gray-400">No services</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((service) => (
        <span
          key={service.key}
          className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
        >
          {service.label}
        </span>
      ))}
    </div>
  );
}

function ServiceEditor({
  vehicleId,
  initial,
  onSaved,
}: {
  vehicleId: string;
  initial: VehicleServiceAvailability;
  onSaved: () => void;
}) {
  const [services, setServices] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateVehicleServiceAvailability(vehicleId, services);
    if (result.success) {
      onSaved();
    } else {
      setError(result.error ?? "Failed to update services");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      {VEHICLE_SERVICES.map((service) => (
        <label key={service.key} className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={services[service.key]}
            onChange={(e) =>
              setServices((prev) => ({ ...prev, [service.key]: e.target.checked }))
            }
            className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
          />
          {service.label}
        </label>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-lg border px-2 py-1 text-xs text-primary hover:bg-primary/5 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Services"}
      </button>
    </div>
  );
}

export default function AdminVehiclesClient({ vehicles }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingServices, setEditingServices] = useState<string | null>(null);

  async function runAction(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    setSuccess("");
    const reason = reasons[id]?.trim() || "Rejected by admin";
    const result =
      action === "approve"
        ? await approveOwnerVehicle(id)
        : await rejectOwnerVehicle(id, reason);

    if (result.success) {
      setSuccess(action === "approve" ? "Vehicle approved successfully." : "Vehicle rejected.");
      router.refresh();
    } else {
      setError(result.error ?? "Action failed");
    }
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
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Registration</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Services</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Documents</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vehicles.map((vehicle) => {
              const status = vehicle.approval_status.toLowerCase();
              const isApproved = status === "approved";
              const isRejected = status === "rejected";
              const isPending = status === "pending";
              const services: VehicleServiceAvailability = {
                service_self_drive: vehicle.service_self_drive,
                service_with_driver: vehicle.service_with_driver,
                service_local_rental: vehicle.service_local_rental,
                service_return_journey: vehicle.service_return_journey,
              };

              return (
                <tr key={vehicle.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {vehicle.vehicle_photo_url ? (
                        <img
                          src={vehicle.vehicle_photo_url}
                          alt=""
                          className="h-12 w-16 rounded-lg object-cover border"
                        />
                      ) : null}
                      <span className="font-medium text-secondary">{vehicle.vehicle_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">{vehicle.registration_number}</td>
                  <td className="px-4 py-4">{vehicle.vehicle_category}</td>
                  <td className="px-4 py-4 min-w-[160px]">
                    {isApproved && editingServices === vehicle.id ? (
                      <ServiceEditor
                        vehicleId={vehicle.id}
                        initial={services}
                        onSaved={() => {
                          setEditingServices(null);
                          setSuccess("Service availability updated.");
                          router.refresh();
                        }}
                      />
                    ) : (
                      <>
                        <ServiceBadges services={services} />
                        {isApproved && (
                          <button
                            type="button"
                            onClick={() => setEditingServices(vehicle.id)}
                            className="mt-2 text-xs text-primary underline"
                          >
                            Edit services
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        isApproved
                          ? "bg-green-100 text-green-700"
                          : isRejected
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {vehicle.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {vehicle.rc_document_url ? (
                        <a
                          href={vehicle.rc_document_url}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-primary underline"
                        >
                          RC
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No RC</span>
                      )}
                      {vehicle.insurance_document_url ? (
                        <a
                          href={vehicle.insurance_document_url}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-primary underline"
                        >
                          Insurance
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No insurance</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 min-w-[200px]">
                    {isPending ? (
                      <>
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
                            className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            {busy === vehicle.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === vehicle.id}
                            onClick={() => runAction(vehicle.id, "reject")}
                            className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {isApproved ? "Approved — edit services above if needed" : "Rejected"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
