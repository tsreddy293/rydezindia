import { isVehicleCustomerListable, normalizeDocumentsStatus } from "@/lib/admin/marketplace-gates";
import {
  isServiceEnabled,
  parseServiceAvailabilityFromRow,
  type VehicleServiceKey,
} from "@/lib/vehicles/services";
import { matchesCity, matchesVehicleCategory, resolveVehicleCity } from "@/lib/vehicles/search";

/** Registration to trace when diagnosing missing self-drive search results. */
export const SELF_DRIVE_DEBUG_REGISTRATION = "AP05DD6116";

export function vehicleMatchesSelfDriveDebug(row: Record<string, unknown>): boolean {
  const reg = String(row.registration_number ?? row.vehicle_number ?? "")
    .replace(/\s/g, "")
    .toUpperCase();
  return reg.includes(SELF_DRIVE_DEBUG_REGISTRATION);
}

function vehicleRegistration(row: Record<string, unknown>): string {
  return String(row.registration_number ?? row.vehicle_number ?? "unknown")
    .replace(/\s/g, "")
    .toUpperCase();
}

function passFail(label: string, pass: boolean, detail?: string): void {
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${label}: ${pass ? "PASS" : "FAIL"}${suffix}`);
}

function vehicleApprovalFromRow(row: Record<string, unknown>): string {
  const status = row.approval_status ?? row.vehicle_approval_status ?? "pending";
  return String(status).toLowerCase().trim();
}

export type OwnerEligibilityDebug = {
  ownerStatus: string;
  kycStatus: string;
  ownerApproved: boolean;
  kycApproved: boolean;
};

export function logSelfDriveDebugVehicleHeader(row: Record<string, unknown>): void {
  console.log(`\n[search-self-drive DEBUG] Vehicle ${vehicleRegistration(row)}`);
}

export function logSelfDriveDebugVehicleFields(input: {
  row: Record<string, unknown>;
  ownerId: string;
  eligibility: OwnerEligibilityDebug;
  ownerCity?: string;
  pickupCity?: string;
  availabilityResult: "INCLUDED" | "EXCLUDED";
}): void {
  const { row, ownerId, eligibility, ownerCity = "", pickupCity, availabilityResult } = input;
  const services = parseServiceAvailabilityFromRow(row);
  const resolvedPickup = pickupCity ?? resolveVehicleCity(row, ownerCity);

  console.log(`vehicle_id: ${String(row.id ?? "—")}`);
  console.log(`owner_id: ${ownerId || "—"}`);
  console.log(`approval_status: ${vehicleApprovalFromRow(row)}`);
  console.log(`owner_status: ${eligibility.ownerStatus}`);
  console.log(`owner_kyc_status: ${eligibility.kycStatus}`);
  console.log(
    `service_types: ${JSON.stringify({
      service_self_drive: services.service_self_drive,
      service_with_driver: services.service_with_driver,
      service_local_rental: services.service_local_rental,
      service_return_journey: services.service_return_journey,
    })}`
  );
  console.log(`city: ${String(row.city ?? row.vehicle_city ?? "—")}`);
  console.log(`pickup_city: ${resolvedPickup || "—"}`);
  console.log(`documents_status: ${normalizeDocumentsStatus(row.documents_status)}`);
  console.log(`is_active: ${row.is_active === undefined ? "—" : String(row.is_active)}`);
  console.log(`availability result: ${availabilityResult}`);
}

/** Gates applied inside fetchSelfDriveSearchVehicles() (permissive self-drive path). */
export function logSelfDriveSearchFetchChecks(input: {
  row: Record<string, unknown>;
  approvedInVehiclesTable: boolean;
  activeOk: boolean;
  selfDriveServiceOk: boolean;
  included: boolean;
}): void {
  const { row, approvedInVehiclesTable, activeOk, selfDriveServiceOk, included } = input;

  logSelfDriveDebugVehicleHeader(row);
  console.log("[fetchSelfDriveSearchVehicles] filter checks (owner gate skipped):");
  passFail("Vehicle approved (either column)", approvedInVehiclesTable, vehicleApprovalFromRow(row));
  passFail("Vehicle is_active", activeOk, String(row.is_active ?? "null"));
  passFail("Self Drive service enabled", selfDriveServiceOk);
  passFail("Final self-drive include", included);
}

/** Gates applied inside fetchApprovedMarketplaceVehicles(). */
export function logFetchApprovedMarketplaceVehicleChecks(input: {
  row: Record<string, unknown>;
  ownerId: string;
  eligibility: OwnerEligibilityDebug;
  usedIsActiveFilter: boolean;
  inApprovedDbRows: boolean;
  service?: VehicleServiceKey;
  includedAfterOwnerGate: boolean;
  includedAfterServiceGate: boolean;
}): void {
  const {
    row,
    ownerId,
    eligibility,
    usedIsActiveFilter,
    inApprovedDbRows,
    service,
    includedAfterOwnerGate,
    includedAfterServiceGate,
  } = input;

  logSelfDriveDebugVehicleHeader(row);

  const vehicleApproved = vehicleApprovalFromRow(row) === "approved";
  const documentsApproved = normalizeDocumentsStatus(row.documents_status) === "approved";
  const isActive =
    row.is_active === undefined || row.is_active === null ? true : Boolean(row.is_active);
  const marketplaceVisible = isVehicleCustomerListable({
    ownerStatus: eligibility.ownerStatus,
    kycStatus: eligibility.kycStatus,
    vehicleApprovalStatus: vehicleApprovalFromRow(row),
    documentsStatus: normalizeDocumentsStatus(row.documents_status),
  });
  const selfDriveEnabled = service
    ? isServiceEnabled(row, service)
    : isServiceEnabled(row, "service_self_drive");

  logSelfDriveDebugVehicleFields({
    row,
    ownerId,
    eligibility,
    availabilityResult: includedAfterServiceGate ? "INCLUDED" : "EXCLUDED",
  });

  console.log("[fetchApprovedMarketplaceVehicles] filter checks:");
  passFail("In approved DB batch", inApprovedDbRows, inApprovedDbRows ? undefined : "not returned by approval_status query");
  passFail("Vehicle approval_status approved", vehicleApproved, vehicleApprovalFromRow(row));
  if (usedIsActiveFilter) {
    passFail("Vehicle is_active", isActive, String(row.is_active ?? "null"));
  }
  passFail("Vehicle Approved (listing gate)", vehicleApproved, vehicleApprovalFromRow(row));
  passFail("Documents Approved", documentsApproved, normalizeDocumentsStatus(row.documents_status));
  passFail("Owner Approved", eligibility.ownerApproved, eligibility.ownerStatus);
  passFail("Owner KYC Approved", eligibility.kycApproved, eligibility.kycStatus);
  passFail("Marketplace Visible (all gates)", marketplaceVisible);
  passFail("Owner + vehicle gate", includedAfterOwnerGate);
  if (service) {
    passFail(`Service ${service}`, selfDriveEnabled, JSON.stringify(parseServiceAvailabilityFromRow(row)));
  } else {
    passFail("Service Self Drive", selfDriveEnabled);
  }
  passFail("Final marketplace include", includedAfterServiceGate);
}

/** Post-fetch filters inside searchSelfDriveVehicles(). */
export function logSearchSelfDrivePostFilters(input: {
  row: Record<string, unknown>;
  result: { pickup_city: string; vehicle_type: string; journey_date?: string };
  filters: {
    city?: string;
    pickupCity?: string;
    vehicleType?: string;
    date?: string;
  };
  includedInFinalResults: boolean;
}): void {
  const { row, result, filters, includedInFinalResults } = input;
  const cityFilter = filters.pickupCity ?? filters.city;

  console.log(`\n[searchSelfDriveVehicles] post-filter checks for ${vehicleRegistration(row)}:`);

  if (cityFilter) {
    const cityMatch = matchesCity(result.pickup_city, cityFilter);
    passFail("City Match", cityMatch, `"${result.pickup_city}" vs filter "${cityFilter}"`);
  } else {
    passFail("City Match", true, "no city filter");
  }

  if (filters.vehicleType) {
    const categoryMatch = matchesVehicleCategory(result.vehicle_type, filters.vehicleType);
    passFail(
      "Vehicle Type Match",
      categoryMatch,
      `"${result.vehicle_type}" vs filter "${filters.vehicleType}"`
    );
  } else {
    passFail("Vehicle Type Match", true, "no category filter");
  }

  if (filters.date) {
    const dateMatch = !result.journey_date || result.journey_date === filters.date;
    passFail(
      "Date Match",
      dateMatch,
      `journey_date="${result.journey_date ?? ""}" vs filter "${filters.date}"`
    );
  } else {
    passFail("Date Match", true, "no date filter");
  }

  passFail("Final search include", includedInFinalResults);
}
