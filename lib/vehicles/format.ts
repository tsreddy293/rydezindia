import type { VehicleServiceAvailability } from "@/lib/vehicles/services";
import { parseServiceAvailabilityFromRow } from "@/lib/vehicles/services";

export type VehicleApprovalStatus = "pending" | "approved" | "rejected";

export interface OwnerVehicleRow {
  id: string;
  owner_id: string;
  vehicle_make: string;
  vehicle_model: string;
  registration_number: string;
  vehicle_year: number;
  vehicle_category: string;
  vehicle_photo_url?: string | null;
  rc_document_url?: string | null;
  insurance_document_url?: string | null;
  approval_status: VehicleApprovalStatus;
  is_active?: boolean;
  city?: string | null;
  daily_fare?: number;
  security_deposit?: number;
  service_self_drive?: boolean;
  service_with_driver?: boolean;
  service_local_rental?: boolean;
  service_return_journey?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type OwnerVehicleRowWithServices = OwnerVehicleRow & VehicleServiceAvailability;

export function vehicleDisplayName(
  vehicle: Pick<OwnerVehicleRow, "vehicle_make" | "vehicle_model" | "vehicle_year">
): string {
  const year = vehicle.vehicle_year ? ` (${vehicle.vehicle_year})` : "";
  return `${vehicle.vehicle_make} ${vehicle.vehicle_model}${year}`.trim();
}

export function normalizeApprovalStatus(value: unknown): VehicleApprovalStatus {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

export function approvalStatusLabel(status: VehicleApprovalStatus): string {
  const labels: Record<VehicleApprovalStatus, string> = {
    pending: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status];
}

export function approvalStatusClasses(status: VehicleApprovalStatus): string {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export function mapVehicleRow(row: Record<string, unknown>): OwnerVehicleRow {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    vehicle_make: String(row.vehicle_make ?? ""),
    vehicle_model: String(row.vehicle_model ?? ""),
    registration_number: String(row.registration_number ?? row.vehicle_number ?? ""),
    vehicle_year: Number(row.vehicle_year ?? 0),
    vehicle_category: String(row.vehicle_category ?? row.vehicle_type ?? ""),
    vehicle_photo_url: row.vehicle_photo_url ? String(row.vehicle_photo_url) : null,
    rc_document_url: row.rc_document_url ? String(row.rc_document_url) : null,
    insurance_document_url: row.insurance_document_url ? String(row.insurance_document_url) : null,
    approval_status: normalizeApprovalStatus(row.approval_status ?? row.vehicle_approval_status),
    is_active: row.is_active === undefined ? true : Boolean(row.is_active),
    city: row.city ? String(row.city) : null,
    daily_fare: Number(row.daily_fare ?? row.daily_rent ?? 0) || 0,
    security_deposit: Number(row.security_deposit ?? 0) || 0,
    ...parseServiceAvailabilityFromRow(row),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}
