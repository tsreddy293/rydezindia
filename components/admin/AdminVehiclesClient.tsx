"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveOwnerVehicle,
  rejectOwnerVehicle,
} from "@/server/actions/vehicles";
import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";
import { KYC_APPROVAL_REQUIRED_MESSAGE } from "@/lib/admin/marketplace-gates";
import { ownerStatusBadgeClasses } from "@/lib/admin/owner-status";
import { approvalStatusClasses } from "@/lib/vehicles/format";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminVehicleRecord } from "@/types/database";

interface Props {
  vehicles: AdminVehicleRecord[];
}

function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-gray-400">Not uploaded</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs text-primary underline"
    >
      {label}
    </a>
  );
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

export default function AdminVehiclesClient({ vehicles }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function runAction(id: string, action: "approve" | "reject", e: React.MouseEvent) {
    e.stopPropagation();
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
      <p className="mb-4 text-sm text-gray-500">Click a row to open the full vehicle review page.</p>
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Photo</th>
              <th className="px-4 py-3 font-medium">Vehicle Name</th>
              <th className="px-4 py-3 font-medium">Registration</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Owner KYC</th>
              <th className="px-4 py-3 font-medium">RC</th>
              <th className="px-4 py-3 font-medium">Insurance</th>
              <th className="px-4 py-3 font-medium">Services</th>
              <th className="px-4 py-3 font-medium">Approval</th>
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

              const ownerApproved = vehicle.owner_status === "approved";
              const kycApproved = vehicle.kyc_status === "approved";
              const canApproveVehicle = ownerApproved && kycApproved;

              return (
                <tr
                  key={vehicle.id}
                  onClick={() => router.push(`/admin/vehicles/${vehicle.id}`)}
                  className="cursor-pointer align-top transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    {vehicle.vehicle_photo_url ? (
                      <img
                        src={vehicle.vehicle_photo_url}
                        alt=""
                        className="h-12 w-16 rounded-lg border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No photo</span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium text-secondary">{vehicle.vehicle_name}</td>
                  <td className="px-4 py-4">{vehicle.registration_number || "—"}</td>
                  <td className="px-4 py-4">{vehicle.owner_name}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-gray-100 text-gray-700">
                      {vehicle.kyc_status ?? "not_submitted"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <DocLink url={vehicle.rc_document_url} label="View" />
                  </td>
                  <td className="px-4 py-4">
                    <DocLink url={vehicle.insurance_document_url} label="View" />
                  </td>
                  <td className="px-4 py-4 min-w-[140px]">
                    <ServiceBadges services={services} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${approvalStatusClasses(
                          vehicle.approval_status as "pending" | "approved" | "rejected"
                        )}`}
                      >
                        {vehicle.approval_status}
                      </span>
                      <div>
                        <AdminStatusBadge status={vehicle.documents_status ?? "pending"} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    {isPending ? (
                      <>
                        {!ownerApproved && (
                          <p className="mb-2 text-xs font-medium text-amber-600">Owner approval required</p>
                        )}
                        {!kycApproved && (
                          <p className="mb-2 text-xs font-medium text-amber-600">
                            {KYC_APPROVAL_REQUIRED_MESSAGE}
                          </p>
                        )}
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
                            disabled={busy === vehicle.id || !canApproveVehicle}
                            title={
                              !canApproveVehicle
                                ? "Approve the owner and KYC in Owner Management first"
                                : undefined
                            }
                            onClick={(e) => runAction(vehicle.id, "approve", e)}
                            className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
                          >
                            {busy === vehicle.id ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={busy === vehicle.id}
                            onClick={(e) => runAction(vehicle.id, "reject", e)}
                            className="rounded-lg border px-3 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {isApproved ? "Approved" : isRejected ? "Rejected" : vehicle.approval_status}
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
