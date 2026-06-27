"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  approveOwnerVehicle,
  rejectOwnerVehicle,
  updateVehicleServiceAvailability,
} from "@/server/actions/vehicles";
import { approveVehicleDocument } from "@/server/actions/phase2Admin";
import VehicleCapabilityBadges from "@/components/vehicles/VehicleCapabilityBadges";
import { VEHICLE_SERVICES, type VehicleServiceAvailability } from "@/lib/vehicles/services";
import { KYC_APPROVAL_REQUIRED_MESSAGE } from "@/lib/admin/marketplace-gates";
import { ownerStatusBadgeClasses } from "@/lib/admin/owner-status";
import { approvalStatusClasses } from "@/lib/vehicles/format";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminVehicleDetailRecord } from "@/types/database";
import { formatDate } from "@/lib/utils";

function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-sm text-gray-400">Not uploaded</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary underline"
    >
      {label}
    </a>
  );
}

function ServiceBadges({ services }: { services: VehicleServiceAvailability }) {
  return <VehicleCapabilityBadges services={services} size="md" />;
}

function entityTypeLabel(type: string): string {
  if (type === "vehicle") return "Vehicle";
  if (type === "vehicle_documents") return "RC / Insurance";
  return type.replace(/_/g, " ");
}

interface Props {
  vehicle: AdminVehicleDetailRecord;
}

export default function AdminVehicleDetailClient({ vehicle }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [docRejectReason, setDocRejectReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [services, setServices] = useState<VehicleServiceAvailability>({
    service_self_drive: vehicle.service_self_drive,
    service_with_driver: vehicle.service_with_driver,
    service_local_rental: vehicle.service_local_rental,
    service_return_journey: vehicle.service_return_journey,
  });
  const [savingServices, setSavingServices] = useState(false);

  const approvalStatus = vehicle.approval_status.toLowerCase();
  const isPending = approvalStatus === "pending";
  const isApproved = approvalStatus === "approved";
  const docsPending = (vehicle.documents_status ?? "pending").toLowerCase() === "pending";
  const ownerApproved = vehicle.owner_status === "approved";
  const kycApproved = vehicle.kyc_status === "approved";
  const canApproveVehicle = ownerApproved && kycApproved;

  async function runVehicleAction(action: "approve" | "reject") {
    setBusy(true);
    setError("");
    setSuccess("");
    const result =
      action === "approve"
        ? await approveOwnerVehicle(vehicle.id)
        : await rejectOwnerVehicle(vehicle.id, rejectReason.trim() || "Rejected by admin");

    if (result.success) {
      setSuccess(action === "approve" ? "Vehicle approved." : "Vehicle rejected.");
      router.refresh();
    } else {
      setError(result.error ?? "Action failed");
    }
    setBusy(false);
  }

  async function runDocumentAction(approved: boolean) {
    setBusy(true);
    setError("");
    setSuccess("");
    const result = await approveVehicleDocument(
      vehicle.id,
      approved,
      approved ? undefined : docRejectReason.trim() || "Documents rejected by admin"
    );
    if (result.success) {
      setSuccess(approved ? "Documents approved." : "Documents rejected.");
      router.refresh();
    } else {
      setError(result.error ?? "Document action failed");
    }
    setBusy(false);
  }

  async function saveServices() {
    setSavingServices(true);
    setError("");
    const result = await updateVehicleServiceAvailability(vehicle.id, services);
    if (result.success) {
      setSuccess("Service configuration updated.");
      router.refresh();
    } else {
      setError(result.error ?? "Failed to update services");
    }
    setSavingServices(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/vehicles" className="text-sm text-primary hover:underline">
        ← Back to Vehicle Management
      </Link>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary mb-4">Vehicle Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Vehicle Name</p>
            <p className="font-medium text-secondary">{vehicle.vehicle_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Registration Number</p>
            <p className="font-medium text-secondary">{vehicle.registration_number || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="font-medium text-secondary">{vehicle.vehicle_category}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Owner</p>
            <p className="font-medium text-secondary">{vehicle.owner_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Owner KYC Status</p>
            <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-gray-100 text-gray-700">
              {vehicle.kyc_status ?? "not_submitted"}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Owner Status</p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ownerStatusBadgeClasses(
                vehicle.owner_status
              )}`}
            >
              {vehicle.owner_status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fuel / Transmission</p>
            <p className="font-medium text-secondary">
              {vehicle.fuel_type} · {vehicle.transmission}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Seats / AC</p>
            <p className="font-medium text-secondary">
              {vehicle.seating_capacity || "—"} seats · {vehicle.ac ? "AC" : "Non-AC"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Vehicle Approval</p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${approvalStatusClasses(
                vehicle.approval_status as "pending" | "approved" | "rejected"
              )}`}
            >
              {vehicle.approval_status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Document Verification</p>
            <AdminStatusBadge status={vehicle.documents_status ?? "pending"} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Submitted</p>
            <p className="font-medium text-secondary">
              {vehicle.created_at ? formatDate(vehicle.created_at) : "—"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary mb-4">RC Document</h2>
          <DocLink url={vehicle.rc_document_url} label="View RC" />
          {docsPending && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {!kycApproved && (
                <p className="text-xs text-amber-600">Owner KYC must be approved before document approval.</p>
              )}
              <textarea
                placeholder="Document rejection reason (optional)"
                value={docRejectReason}
                onChange={(e) => setDocRejectReason(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !kycApproved}
                  onClick={() => runDocumentAction(true)}
                  className="rounded-lg border px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
                >
                  Approve Documents
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runDocumentAction(false)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject Documents
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary mb-4">Insurance Document</h2>
          <DocLink url={vehicle.insurance_document_url} label="View Insurance" />
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary mb-4">Vehicle Photos</h2>
        {vehicle.images.length === 0 ? (
          <p className="text-sm text-gray-500">No photos uploaded.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {vehicle.images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img src={url} alt="" className="h-32 w-full rounded-xl border object-cover" />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary mb-4">Service Configuration</h2>
        {isApproved ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {VEHICLE_SERVICES.map((service) => (
                <label key={service.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={services[service.key]}
                    onChange={(e) =>
                      setServices((prev) => ({ ...prev, [service.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  {service.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={savingServices}
              onClick={saveServices}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingServices ? "Saving..." : "Save Services"}
            </button>
          </div>
        ) : (
          <ServiceBadges services={services} />
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary mb-4">Vehicle Actions</h2>
        {isPending ? (
          <div className="space-y-3">
            {!ownerApproved && (
              <p className="text-sm text-amber-600">Owner must be approved in Owner Management first.</p>
            )}
            {!kycApproved && <p className="text-sm text-amber-600">{KYC_APPROVAL_REQUIRED_MESSAGE}</p>}
            <textarea
              placeholder="Rejection reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !canApproveVehicle}
                onClick={() => runVehicleAction("approve")}
                className="rounded-lg border px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                Approve Vehicle
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runVehicleAction("reject")}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject Vehicle
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {isApproved ? "This vehicle is approved and live." : "This vehicle was rejected."}
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-secondary mb-4">Approval History</h2>
        {vehicle.approval_logs.length === 0 ? (
          <p className="text-sm text-gray-500">No approval events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {vehicle.approval_logs.map((log) => (
              <div key={log.id} className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium capitalize text-secondary">
                    {entityTypeLabel(log.entity_type)} — {log.action}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">By {log.approver_name ?? "Admin"}</p>
                {log.remarks && <p className="mt-1 text-gray-600">{log.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
