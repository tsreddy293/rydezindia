import {
  isOwnerKycApproved,
  isVehicleCustomerListable,
  ownerMarketplaceEligibilityFromRow,
} from "@/lib/admin/marketplace-gates";
import type { DriverVehicleResult } from "@/types/database";
import {
  isServiceEnabled,
  parseServiceAvailabilityFromRow,
  type VehicleServiceKey,
} from "@/lib/vehicles/services";
import {
  isTripTypeEnabled,
  parseTripTypesFromRow,
  resolveTripTypeKeyFromSearchLabel,
  type VehicleTripTypeKey,
} from "@/lib/vehicles/trip-types";
import { matchesCity, matchesVehicleCategory, resolveVehicleCity } from "@/lib/vehicles/search";

export const DRIVER_DEBUG_REGISTRATION = "AP05DD6116";

type Row = Record<string, unknown>;

export type DriverSearchFilters = {
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  vehicleType?: string;
  tripType?: string;
  tripTypeKey?: VehicleTripTypeKey | null;
};

export type DriverOwnerEligibility = ReturnType<typeof ownerMarketplaceEligibilityFromRow>;

function vehicleRegistration(row: Row): string {
  return String(row.registration_number ?? row.vehicle_number ?? "unknown")
    .replace(/\s/g, "")
    .toUpperCase();
}

function vehicleApprovalStatus(row: Row): string {
  return String(row.approval_status ?? row.vehicle_approval_status ?? "pending")
    .toLowerCase()
    .trim();
}

export function isDriverVehicleActive(row: Row): boolean {
  if (row.is_active === false) return false;
  const status = String(row.status ?? "").toLowerCase().trim();
  return status !== "inactive";
}

export function isDriverVehicleAvailable(row: Row): boolean {
  if (row.available === false) return false;
  const status = String(row.status ?? row.availability ?? "available").toLowerCase().trim();
  if (status === "active" || status === "available") return true;
  return !["unavailable", "inactive", "blocked", "booked"].includes(status);
}

function readServiceAreaCities(row: Row): string[] {
  const raw = row.service_areas ?? row.operating_cities ?? row.service_cities;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((value) => String(value).trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      // comma-separated fallback
    }
    return trimmed
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

export function hasConfiguredServiceAreas(row: Row): boolean {
  return readServiceAreaCities(row).length > 0;
}

function serviceAreaMatchesPickup(row: Row, pickupCity?: string): boolean {
  if (!pickupCity?.trim()) return true;
  const areas = readServiceAreaCities(row);
  if (areas.length === 0) return true;
  return areas.some((area) => matchesCity(area, pickupCity));
}

function pickupProximityScore(pickupCity: string, filterCity?: string): number {
  if (!filterCity?.trim()) return 0;
  if (!pickupCity.trim()) return 1;
  if (matchesCity(pickupCity, filterCity)) return 0;
  return 2;
}

export function sortDriverResultsByPickupProximity(
  results: DriverVehicleResult[],
  pickupCity?: string
): DriverVehicleResult[] {
  if (!pickupCity?.trim()) return results;
  return [...results].sort((a, b) => {
    const scoreA = pickupProximityScore(a.pickup_city, pickupCity);
    const scoreB = pickupProximityScore(b.pickup_city, pickupCity);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return a.vehicle_name.localeCompare(b.vehicle_name);
  });
}

/** Marketplace gates applied before mapping search results. */
export function evaluateDriverVehicleCoreGates(input: {
  row: Row;
  ownerId: string;
  eligibility: DriverOwnerEligibility;
  serviceKey: VehicleServiceKey;
}): string[] {
  const { row, ownerId, eligibility, serviceKey } = input;
  const reasons: string[] = [];

  if (!ownerId) reasons.push("missing owner");
  if (!isDriverVehicleActive(row)) reasons.push("inactive");
  if (!isDriverVehicleAvailable(row)) reasons.push("unavailable");
  if (vehicleApprovalStatus(row) !== "approved") reasons.push("vehicle not approved");

  if (!eligibility.ownerApproved) reasons.push("owner not approved");
  if (!isOwnerKycApproved(eligibility.kycStatus)) reasons.push("owner kyc not approved");

  if (
    !isVehicleCustomerListable({
      ownerStatus: eligibility.ownerStatus,
      kycStatus: eligibility.kycStatus,
      vehicleApprovalStatus: vehicleApprovalStatus(row),
    })
  ) {
    if (reasons.length === 0) reasons.push("marketplace visibility gate failed");
  }

  if (!isServiceEnabled(row, serviceKey)) {
    reasons.push(
      serviceKey === "service_local_rental"
        ? "service type mismatch (local rental)"
        : "service type mismatch (with driver)"
    );
  }

  return reasons;
}

/** Optional post-filters: service area, vehicle type, date only. */
export function evaluateDriverVehicleSearchFilters(input: {
  row: Row;
  ownerCity: string;
  filters: DriverSearchFilters;
}): string[] {
  const { row, ownerCity, filters } = input;
  const reasons: string[] = [];
  const pickupCity = filters.pickupCity?.trim();

  if (pickupCity && hasConfiguredServiceAreas(row) && !serviceAreaMatchesPickup(row, pickupCity)) {
    reasons.push("city mismatch");
  }

  if (
    filters.vehicleType &&
    !matchesVehicleCategory(String(row.vehicle_category ?? row.vehicle_type ?? ""), filters.vehicleType)
  ) {
    reasons.push("vehicle type mismatch");
  }

  if (filters.date) {
    const journeyDate = String(row.journey_date ?? "").trim();
    if (journeyDate && journeyDate !== filters.date) {
      reasons.push("date mismatch");
    }
  }

  const tripTypeKey =
    filters.tripTypeKey ?? resolveTripTypeKeyFromSearchLabel(filters.tripType);
  if (tripTypeKey && !isTripTypeEnabled(row, tripTypeKey)) {
    reasons.push("trip type mismatch");
  }

  void resolveVehicleCity(row, ownerCity);
  return reasons;
}

export function logDriverVehicleExclusion(row: Row, reasons: string[]): void {
  if (reasons.length === 0) return;
  console.log(`Vehicle ${vehicleRegistration(row)} excluded because:`);
  for (const reason of reasons) {
    console.log(`- ${reason}`);
  }
}

export function logDriverSearchResultsTable(results: DriverVehicleResult[]): void {
  console.table(
    results.map((result) => ({
      registration: result.vehicle_number ?? "",
      vehicle_name: result.vehicle_name,
      owner: result.owner_name,
      pickup_city: result.pickup_city,
      rate_per_km: result.rate_per_km,
      service: "with_driver",
    }))
  );
}

export function vehicleMatchesDriverDebug(row: Row): boolean {
  return vehicleRegistration(row).includes(DRIVER_DEBUG_REGISTRATION);
}

export type DriverVehicleAuditSnapshot = {
  ownerApproved: boolean;
  vehicleApproved: boolean;
  status: string;
  availability: string;
  selfDrive: boolean;
  vehicleWithDriver: boolean;
  returnJourney: boolean;
  localRental: boolean;
  tripOneWay: boolean;
  tripRoundTrip: boolean;
  tripMultiCity: boolean;
  tripAirportTransfer: boolean;
  tripLocalRental: boolean;
  legacyServiceType: string | null;
  ownerKycApproved: boolean;
  ownerStatus: string;
  kycStatus: string;
};

export function buildDriverVehicleAuditSnapshot(input: {
  row: Row;
  eligibility: DriverOwnerEligibility;
}): DriverVehicleAuditSnapshot {
  const { row, eligibility } = input;
  const services = parseServiceAvailabilityFromRow(row);
  const trips = parseTripTypesFromRow(row);
  const status = String(row.status ?? "").toLowerCase().trim() || "(unset)";
  const availability = String(row.availability ?? row.status ?? "available").toLowerCase().trim();

  return {
    ownerApproved: eligibility.ownerApproved,
    vehicleApproved: vehicleApprovalStatus(row) === "approved",
    status,
    availability,
    selfDrive: services.service_self_drive,
    vehicleWithDriver: services.service_with_driver,
    returnJourney: services.service_return_journey,
    localRental: services.service_local_rental,
    tripOneWay: trips.trip_one_way,
    tripRoundTrip: trips.trip_round_trip,
    tripMultiCity: trips.trip_multi_city,
    tripAirportTransfer: trips.trip_airport_transfer,
    tripLocalRental: trips.trip_local_rental,
    legacyServiceType: row.service_type ? String(row.service_type) : null,
    ownerKycApproved: isOwnerKycApproved(eligibility.kycStatus),
    ownerStatus: eligibility.ownerStatus,
    kycStatus: eligibility.kycStatus,
  };
}

export function evaluateDriverVehicleAllFilters(input: {
  row: Row;
  ownerId: string;
  ownerCity: string;
  eligibility: DriverOwnerEligibility;
  serviceKey: VehicleServiceKey;
  filters: DriverSearchFilters;
}): string[] {
  const core = evaluateDriverVehicleCoreGates({
    row: input.row,
    ownerId: input.ownerId,
    eligibility: input.eligibility,
    serviceKey: input.serviceKey,
  });
  if (core.length > 0) return core;

  return evaluateDriverVehicleSearchFilters({
    row: input.row,
    ownerCity: input.ownerCity,
    filters: input.filters,
  });
}

export function logDriverVehicleAudit(input: {
  row: Row;
  snapshot: DriverVehicleAuditSnapshot;
  reasons: string[];
}): void {
  const registration = vehicleRegistration(input.row);
  console.log(`\nVehicle:\n${registration}`);
  console.log(`ownerApproved = ${input.snapshot.ownerApproved}`);
  console.log(`vehicleApproved = ${input.snapshot.vehicleApproved}`);
  console.log(`status = ${input.snapshot.status}`);
  console.log(`availability = ${input.snapshot.availability}`);
  console.log(`selfDrive = ${input.snapshot.selfDrive}`);
  console.log(`vehicleWithDriver = ${input.snapshot.vehicleWithDriver}`);
  console.log(`returnJourney = ${input.snapshot.returnJourney}`);
  console.log(`localRental = ${input.snapshot.localRental}`);
  console.log(`tripOneWay = ${input.snapshot.tripOneWay}`);
  console.log(`tripRoundTrip = ${input.snapshot.tripRoundTrip}`);
  console.log(`tripMultiCity = ${input.snapshot.tripMultiCity}`);
  console.log(`tripAirportTransfer = ${input.snapshot.tripAirportTransfer}`);
  console.log(`tripLocalRental = ${input.snapshot.tripLocalRental}`);
  if (input.snapshot.legacyServiceType) {
    console.log(`legacyServiceType = ${input.snapshot.legacyServiceType}`);
  }
  console.log(`ownerStatus = ${input.snapshot.ownerStatus}`);
  console.log(`kycStatus = ${input.snapshot.kycStatus}`);
  console.log(`ownerKycApproved = ${input.snapshot.ownerKycApproved}`);

  if (input.reasons.length === 0) {
    console.log("Result:\nPASS");
    return;
  }

  console.log("Result:\nFAIL:");
  for (const reason of input.reasons) {
    console.log(`- ${reason}`);
  }
}

export function logDriverSearchSummary(input: {
  matched: number;
  rejected: number;
  rejections: { registration: string; reasons: string[] }[];
}): void {
  console.log(`\nMatched Vehicles:\n${input.matched}`);
  console.log(`\nRejected Vehicles:\n${input.rejected}`);
  if (input.rejections.length > 0) {
    console.log("\nRejection details:");
    for (const entry of input.rejections) {
      console.log(`${entry.registration}: ${entry.reasons.join("; ")}`);
    }
  }
}
