import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumnError } from "@/lib/supabase/errors";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { normalizeRole } from "@/lib/auth/roles";
import { normalizeOwnerStatus } from "@/lib/admin/owner-status";
import {
  isOwnerKycApproved,
  isStrictOwnerApproved,
  isVehicleCustomerListable,
  normalizeDocumentsStatus,
  ownerMarketplaceEligibilityFromRow,
  vehicleApprovalBlockedReason,
} from "@/lib/admin/marketplace-gates";
import { fetchOwnerApprovalState } from "@/lib/services/owner-approval-sync";
import { ownerProfileDocumentsToSet } from "@/lib/services/owner-profile-kyc";
import { ownerKycCanApprove } from "@/lib/admin/owner-kyc";
import { normalizeProfileStatus } from "@/lib/admin/owner-profile-fields";
import { ownerStatusFromRow } from "@/lib/admin/owner-profile-status";
import { resolveOwnerKycAdminStatus } from "@/lib/admin/owner-kyc-status";
import {
  customerKycDocumentsForAdmin,
  customerKycHasRequiredDocs,
  customerKycDocumentsFromRow,
} from "@/lib/admin/customer-kyc-fields";
import { effectiveVehicleStat } from "@/lib/admin/vehicle-approval";
import {
  bookingRevenueAmount,
  countsTowardRevenue,
  sumBookingRevenue,
  sumBookingRevenueSince,
} from "@/lib/bookings/revenue-eligibility";
import { getVehicleImages } from "@/lib/services/vehicle-upload";
import type {
  AdminOwnerKycRecord,
  AdminCustomerKycRecord,
  AdminOwnerManagementRecord,
  AdminCustomerManagementRecord,
  AdminVehicleDocumentRecord,
  AdminOwnerRecord,
  AdminUserRecord,
  AdminVehicleRecord,
  ChartPoint,
  DriverVehicleResult,
  BookingConfirmation,
  OwnerDashboardMetrics,
  PlatformStats,
  OwnerStats,
  RecentBooking,
  RecentOwner,
  RecentVehicle,
  SearchResult,
  SelfDriveResult,
  UserBooking,
  UserBookingExtended,
  MyBookingRecord,
  UserRole,
  OwnerStatus,
  VehicleDetail,
  VehicleOwner,
} from "@/types/database";
import { scoreRouteMatch } from "@/lib/services/route-matching";
import { resolveUserName } from "@/lib/users/display-name";
import {
  deriveProtectionFields,
  selectBookingById,
  selectBookingsWithFilter,
  selectBookingsWithRequestedColumns,
  BOOKING_OWNER_COLUMN_SETS,
} from "@/lib/bookings/booking-select";
import {
  buildDriverVehicleAuditSnapshot,
  evaluateDriverVehicleAllFilters,
  evaluateDriverVehicleSearchFilters,
  logDriverSearchResultsTable,
  logDriverSearchSummary,
  logDriverVehicleAudit,
  logDriverVehicleExclusion,
  sortDriverResultsByPickupProximity,
  vehicleMatchesDriverDebug,
  DRIVER_DEBUG_REGISTRATION,
  type DriverOwnerEligibility,
} from "@/lib/vehicles/driver-search-filter";
import { mapVehicleRow } from "@/lib/vehicles/format";
import {
  buildVehicleDisplayName,
  maskRegistrationNumber,
  matchesCity,
  normalizeVehicleCategory,
  resolveDailyFare,
  resolveSecurityDeposit,
  resolveVehicleCity,
} from "@/lib/vehicles/search";
import {
  applyVehicleCategoryDbFilter,
  isAllVehicleTypesFilter,
  resolveVehicleCategoryDbFilter,
  vehicleRowMatchesTypeFilter,
} from "@/lib/vehicles/vehicle-type-filter";
import {
  isServiceEnabled,
  type VehicleServiceKey,
} from "@/lib/vehicles/services";
import {
  resolveTripTypeKeyFromSearchLabel,
  vehicleSupportsSearchTrip,
} from "@/lib/vehicles/trip-types";

const db = () => createAdminClient();

export type QueryResult<T> = {
  data: T;
  error: string | null;
};

type Row = Record<string, unknown>;

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

function asRows(data: unknown): Row[] {
  return Array.isArray(data) ? (data as Row[]) : [];
}

function getString(row: Row | null | undefined, key: string, fallback = "") {
  const value = row?.[key];
  return value === null || value === undefined ? fallback : String(value);
}

function getNumber(row: Row | null | undefined, key: string, fallback = 0) {
  const value = row?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPublicListing(row: Row) {
  const status = getString(row, "status") || getString(row, "availability", "available");
  const approval = getString(row, "vehicle_approval_status", "approved");
  return status === "available" && approval === "approved";
}

function getDateKey(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  return date.toISOString().slice(0, 10);
}

function mapOwnerRow(
  row: Row & {
    user?: { name?: string; email?: string; mobile?: string; city?: string } | null;
  }
): VehicleOwner {
  return {
    id: String(row.id),
    owner_id: row.owner_id ? String(row.owner_id) : null,
    name: String(row.name ?? row.user?.name ?? row.owner_name ?? "Owner"),
    mobile: String(row.mobile ?? row.user?.mobile ?? ""),
    email: String(row.email ?? row.user?.email ?? ""),
    city: String(row.city ?? row.user?.city ?? row.address ?? ""),
    aadhaar_number: String(row.aadhaar_number ?? ""),
    license_number: String(row.license_number ?? row.driving_license_number ?? ""),
    vehicle_type: String(row.vehicle_type ?? ""),
    vehicle_number: String(row.vehicle_number ?? ""),
    vehicle_model: String(row.vehicle_model ?? row.vehicle_name ?? ""),
    seating_capacity: Number(row.seating_capacity ?? row.seats ?? 0),
    status: (row.status as VehicleOwner["status"]) ?? "pending",
    created_at: String(row.created_at ?? ""),
  };
}

async function countTable(table: string, options?: { createdAfter?: string }): Promise<number> {
  let query = db().from(table).select("id", { count: "exact", head: true });
  if (options?.createdAfter) query = query.gte("created_at", options.createdAfter);
  const { count, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return 0;
    console.error(`[countTable] ${table}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

async function countTableWhere(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await db()
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) {
    if (isMissingTableError(error)) return 0;
    console.error(`[countTableWhere] ${table}.${column}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

function getVehicleApprovalStatus(row: Row): string {
  return getString(row, "approval_status", getString(row, "vehicle_approval_status", "pending"));
}

function isVehicleMarketplaceApproved(row: Row): boolean {
  return getVehicleApprovalStatus(row).toLowerCase().trim() === "approved";
}

function isVehicleSearchActive(row: Row): boolean {
  if (row.is_active === false) return false;
  const status = getString(row, "status", "").toLowerCase();
  return status !== "inactive";
}

function isVehicleAvailableForSearch(row: Row): boolean {
  if (row.available === false) return false;
  const status = getString(row, "status", getString(row, "availability", "available")).toLowerCase();
  if (status === "active" || status === "available") return true;
  return !["unavailable", "inactive", "blocked", "booked"].includes(status);
}

function passesSelfDriveService(row: Row): boolean {
  return row.service_self_drive !== false;
}

function formatVehicleDisplayName(row: Row): string {
  const make = getString(row, "vehicle_make");
  const model = getString(row, "vehicle_model");
  const year = getString(row, "vehicle_year");
  if (make || model) {
    return [make, model, year].filter(Boolean).join(" ").trim();
  }
  return getString(row, "vehicle_name", getString(row, "registration_number", "Vehicle"));
}

async function countRegisteredOwners(): Promise<number> {
  const ownersByRole = await countTableWhere("users", "role", "owner");
  if (ownersByRole > 0) return ownersByRole;

  const vehicleRows = await selectRows("vehicles", "owner_id", 500);
  const uniqueOwnerIds = new Set(
    vehicleRows.map((row) => getString(row, "owner_id")).filter(Boolean)
  );
  return uniqueOwnerIds.size;
}

async function selectRecentOwnerUsers(limit = 8): Promise<Row[]> {
  const { data, error } = await db()
    .from("users")
    .select("id, name, mobile, role, created_at")
    .eq("role", "owner")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[selectRecentOwnerUsers]", error.message);
    return [];
  }
  return asRows(data);
}

async function selectRows(table: string, columns = "*", limit = 100): Promise<Row[]> {
  if (table === "bookings" && columns !== "*") {
    return selectBookingsWithRequestedColumns(columns, limit);
  }

  const { data, error } = await db()
    .from(table)
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error(`[selectRows] ${table}:`, error.message);
    return [];
  }
  return asRows(data);
}

async function selectOwnerProfilesForAdmin(limit = 500): Promise<Row[]> {
  const client = db();
  const withStatus =
    "user_id, city, kyc_status, owner_status, aadhaar_document_url, license_document_url, selfie_document_url, address_proof_url";
  const docsOnly =
    "user_id, city, aadhaar_document_url, license_document_url, selfie_document_url, address_proof_url";

  const first = await client.from("owner_profiles").select(withStatus).limit(limit);
  let rows: unknown = first.data;
  let error = first.error;

  if (error && isMissingColumnError(error, "kyc_status", "owner_status", "status")) {
    const fallback = await client.from("owner_profiles").select(docsOnly).limit(limit);
    rows = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[selectOwnerProfilesForAdmin]", error.message);
    return [];
  }

  return asRows(rows);
}

async function getVehicleMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("vehicles")
    .select("id, owner_id, vehicle_number, vehicle_name, vehicle_type, fuel_type, transmission, seats, photos, status, has_ac, rating, vehicle_approval_status, created_at")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getVehicleMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

async function getLegacyVehicleOwnerMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("vehicle_owners")
    .select("id, owner_id, name, mobile, email, city, vehicle_type, vehicle_number, vehicle_model, seating_capacity, status, created_at")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getLegacyVehicleOwnerMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

async function getUserMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, Row>();

  const { data, error } = await db()
    .from("users")
    .select("id, name, mobile, email, city")
    .in("id", uniqueIds);

  if (error) {
    if (isMissingTableError(error)) return new Map<string, Row>();
    console.error("[getUserMap]", error.message);
    return new Map<string, Row>();
  }

  return new Map(asRows(data).map((row) => [String(row.id), row]));
}

async function resolveOwnerCities(ownerIds: string[]): Promise<Map<string, string>> {
  const cityMap = new Map<string, string>();
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return cityMap;

  const userMap = await getUserMap(uniqueIds);
  for (const [id, row] of userMap) {
    const city = getString(row, "city");
    if (city) cityMap.set(id, city);
  }

  let missing = uniqueIds.filter((id) => !cityMap.has(id));
  if (missing.length > 0) {
    const { data, error } = await db()
      .from("owner_profiles")
      .select("user_id, city")
      .in("user_id", missing);
    if (!error) {
      asRows(data).forEach((row) => {
        const id = getString(row, "user_id");
        const city = getString(row, "city");
        if (id && city) cityMap.set(id, city);
      });
    }
  }

  missing = uniqueIds.filter((id) => !cityMap.has(id));
  if (missing.length > 0) {
    const { data, error } = await db()
      .from("vehicle_owners")
      .select("owner_id, city")
      .in("owner_id", missing);
    if (!error) {
      asRows(data).forEach((row) => {
        const id = getString(row, "owner_id");
        const city = getString(row, "city");
        if (id && city) cityMap.set(id, city);
      });
    }
  }

  missing = uniqueIds.filter((id) => !cityMap.has(id));
  for (const ownerId of missing) {
    try {
      const { data, error } = await db().auth.admin.getUserById(ownerId);
      if (!error && data.user?.user_metadata?.city) {
        cityMap.set(ownerId, String(data.user.user_metadata.city));
      }
    } catch {
      // ignore auth lookup failures
    }
  }

  return cityMap;
}

async function resolveOwnerNames(ownerIds: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return nameMap;

  const userMap = await getUserMap(uniqueIds);
  for (const [id, row] of userMap) {
    const name = resolveUserName(row as { name?: string; full_name?: string });
    if (name) nameMap.set(id, name);
  }

  const missing = uniqueIds.filter((id) => !nameMap.has(id));
  for (const ownerId of missing) {
    try {
      const { data, error } = await db().auth.admin.getUserById(ownerId);
      if (!error && data.user?.user_metadata?.name) {
        nameMap.set(ownerId, String(data.user.user_metadata.name));
      }
    } catch {
      // ignore auth lookup failures
    }
  }

  return nameMap;
}

async function resolveOwnerMobiles(ownerIds: string[]): Promise<Map<string, string>> {
  const mobileMap = new Map<string, string>();
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return mobileMap;

  const userMap = await getUserMap(uniqueIds);
  for (const [id, row] of userMap) {
    const mobile = getString(row, "mobile");
    if (mobile) mobileMap.set(id, mobile);
  }

  const missing = uniqueIds.filter((id) => !mobileMap.has(id));
  for (const ownerId of missing) {
    try {
      const { data, error } = await db().auth.admin.getUserById(ownerId);
      if (!error && data.user?.user_metadata?.mobile) {
        mobileMap.set(ownerId, String(data.user.user_metadata.mobile));
      }
    } catch {
      // ignore auth lookup failures
    }
  }

  return mobileMap;
}

async function mergeApprovedSelfDriveListings(
  primary: Row[],
  vehicleType?: string
): Promise<Row[]> {
  const byId = new Map(primary.map((row) => [getString(row, "id"), row]));

  const { data, error } = await db()
    .from("self_drive_vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn("[fetchSelfDriveSearchVehicles] self_drive_vehicles:", error.message);
    }
    return primary;
  }

  const missingIds: string[] = [];
  for (const listing of asRows(data)) {
    const listingApproved =
      getString(listing, "vehicle_approval_status", "pending") === "approved" ||
      getString(listing, "status") === "available";
    if (!listingApproved) continue;

    const vehicleId = getString(listing, "vehicle_id");
    if (!vehicleId || byId.has(vehicleId)) continue;
    missingIds.push(vehicleId);
  }

  if (missingIds.length === 0) return primary;

  let vehicleQuery = db()
    .from("vehicles")
    .select("*")
    .in("id", [...new Set(missingIds)]);
  vehicleQuery = applyVehicleCategoryDbFilter(vehicleQuery, vehicleType);

  const { data: vehicles } = await vehicleQuery;

  for (const row of asRows(vehicles)) {
    if (!isVehicleSearchActive(row) || !passesSelfDriveService(row)) continue;
    byId.set(getString(row, "id"), row);
  }

  return [...byId.values()];
}

/** Self-drive search: approved vehicles with optional vehicle_category filter at query time. */
async function fetchSelfDriveSearchVehicles(
  vehicleType?: string
): Promise<{ rows: Row[]; error: string | null }> {
  let query = db()
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  query = applyVehicleCategoryDbFilter(query, vehicleType);

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) return { rows: [], error: null };
    return { rows: [], error: error.message };
  }

  let rows = asRows(data).filter(
    (row) =>
      isVehicleMarketplaceApproved(row) && isVehicleSearchActive(row) && passesSelfDriveService(row)
  );

  rows = await mergeApprovedSelfDriveListings(rows, vehicleType);

  return { rows, error: null };
}

async function fetchApprovedMarketplaceVehicles(
  service?: VehicleServiceKey,
  vehicleType?: string
): Promise<{ rows: Row[]; error: string | null }> {
  let query = db()
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  query = applyVehicleCategoryDbFilter(query, vehicleType);

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) return { rows: [], error: null };
    return { rows: [], error: error.message };
  }

  // Match either approval_status or vehicle_approval_status (admin may set only one).
  const rawRows = asRows(data).filter(
    (row) =>
      isVehicleSearchActive(row) &&
      isVehicleMarketplaceApproved(row) &&
      isVehicleAvailableForSearch(row)
  );

  let rows = rawRows;
  const ownerIds = rows.map((row) => getString(row, "owner_id")).filter(Boolean);
  const eligibilityMap = await getOwnerMarketplaceEligibilityMap(ownerIds);

  const rowsAfterOwnerGate: Row[] = [];
  for (const row of rows) {
    const ownerId = getString(row, "owner_id");
    if (isVehicleCustomerVisible(row, ownerId, eligibilityMap)) {
      rowsAfterOwnerGate.push(row);
      continue;
    }
    if (service === "service_with_driver" || service === "service_local_rental") {
      const eligibility = eligibilityMap.get(ownerId) ?? ownerMarketplaceEligibilityFromRow({});
      const reasons: string[] = [];
      if (!eligibility.ownerApproved) reasons.push("owner not approved");
      if (!isOwnerKycApproved(eligibility.kycStatus)) reasons.push("owner kyc not approved");
      if (getVehicleApprovalStatus(row) !== "approved") reasons.push("vehicle not approved");
      if (!isVehicleSearchActive(row)) reasons.push("inactive");
      if (!isVehicleAvailableForSearch(row)) reasons.push("unavailable");
      if (reasons.length === 0) reasons.push("marketplace visibility gate failed");
      logDriverVehicleExclusion(row, reasons);
    }
  }

  rows = rowsAfterOwnerGate;

  let rowsAfterServiceGate: Row[] = [];
  if (service) {
    const before = rows.length;
    for (const row of rows) {
      if (isServiceEnabled(row, service)) {
        rowsAfterServiceGate.push(row);
        continue;
      }
      if (service === "service_with_driver" || service === "service_local_rental") {
        logDriverVehicleExclusion(row, [
          service === "service_local_rental"
            ? "service type mismatch (local rental)"
            : "service type mismatch (with driver)",
        ]);
      }
    }
    rows = rowsAfterServiceGate;
  }

  return { rows, error: null };
}

async function loadDriverDebugVehicleRow(fetchedRows: Row[]): Promise<Row | null> {
  const inBatch = fetchedRows.find(vehicleMatchesDriverDebug);
  if (inBatch) return inBatch;

  const client = db();
  const { data, error } = await client
    .from("vehicles")
    .select("*")
    .ilike("registration_number", `%${DRIVER_DEBUG_REGISTRATION}%`)
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    return data as Row;
  }

  console.warn(`[searchDriverVehicles] Vehicle ${DRIVER_DEBUG_REGISTRATION} not found in public.vehicles`);
  return null;
}

async function mergeDriverVehicleListings(
  primary: Row[],
  vehicleType?: string
): Promise<Row[]> {
  const byId = new Map(primary.map((row) => [getString(row, "id"), row]));

  const { data, error } = await db()
    .from("driver_vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (!isMissingTableError(error)) {
      console.warn("[fetchDriverSearchVehicles] driver_vehicles:", error.message);
    }
    return primary;
  }

  const missingVehicleIds: string[] = [];
  for (const listing of asRows(data)) {
    const listingApproved =
      getString(listing, "vehicle_approval_status", "pending") === "approved" ||
      getString(listing, "status", "available") === "available";
    if (!listingApproved) continue;

    const vehicleId = getString(listing, "vehicle_id");
    if (!vehicleId || byId.has(vehicleId)) continue;
    missingVehicleIds.push(vehicleId);
  }

  if (missingVehicleIds.length === 0) return primary;

  let vehicleQuery = db()
    .from("vehicles")
    .select("*")
    .in("id", [...new Set(missingVehicleIds)]);
  vehicleQuery = applyVehicleCategoryDbFilter(vehicleQuery, vehicleType);

  const { data: vehicles } = await vehicleQuery;

  for (const row of asRows(vehicles)) {
    byId.set(getString(row, "id"), row);
  }

  return [...byId.values()];
}

async function loadDriverSearchCandidates(
  vehicleType?: string
): Promise<{ rows: Row[]; error: string | null }> {
  let query = db()
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  query = applyVehicleCategoryDbFilter(query, vehicleType);

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) return { rows: [], error: null };
    return { rows: [], error: error.message };
  }

  const rows = await mergeDriverVehicleListings(asRows(data), vehicleType);
  console.log(
    `[loadDriverSearchCandidates] loaded ${rows.length} vehicle candidate(s)` +
      (vehicleType && !isAllVehicleTypesFilter(vehicleType)
        ? ` (vehicle_category=${resolveVehicleCategoryDbFilter(vehicleType)})`
        : "")
  );
  return { rows, error: null };
}

async function fetchDriverSearchVehicles(
  serviceKey: VehicleServiceKey,
  vehicleType?: string
): Promise<{ rows: Row[]; error: string | null }> {
  const { rows: allRows, error } = await loadDriverSearchCandidates(vehicleType);
  if (error) return { rows: [], error };

  const ownerIds = [...new Set(allRows.map((row) => getString(row, "owner_id")).filter(Boolean))];
  const eligibilityByOwner = new Map<string, DriverOwnerEligibility>();
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const state = await fetchOwnerApprovalState(ownerId);
      eligibilityByOwner.set(ownerId, {
        ownerStatus: state.ownerStatus,
        kycStatus: state.kycStatus,
        ownerApproved: state.ownerApproved,
        kycApproved: state.kycApproved,
      });
    })
  );

  const included: Row[] = [];
  const rejections: { registration: string; reasons: string[] }[] = [];

  for (const row of allRows) {
    const ownerId = getString(row, "owner_id");
    const eligibility = eligibilityByOwner.get(ownerId) ?? ownerMarketplaceEligibilityFromRow({});
    const snapshot = buildDriverVehicleAuditSnapshot({ row, eligibility });
    const reasons = evaluateDriverVehicleAllFilters({
      row,
      ownerId,
      ownerCity: "",
      eligibility,
      serviceKey,
      filters: {},
    });

    logDriverVehicleAudit({ row, snapshot, reasons });

    if (reasons.length > 0) {
      rejections.push({
        registration: String(row.registration_number ?? row.id),
        reasons,
      });
      continue;
    }

    included.push(row);
  }

  logDriverSearchSummary({
    matched: included.length,
    rejected: rejections.length,
    rejections,
  });

  const debugRow = await loadDriverDebugVehicleRow(allRows);
  if (debugRow && !included.some((row) => String(row.id) === String(debugRow.id))) {
    const ownerId = getString(debugRow, "owner_id");
    const state = await fetchOwnerApprovalState(ownerId);
    console.warn(`[fetchDriverSearchVehicles] ${DRIVER_DEBUG_REGISTRATION} audit:`, {
      ownerStatus: state.ownerStatus,
      kycStatus: state.kycStatus,
      ownerApproved: state.ownerApproved,
      kycApproved: state.kycApproved,
      profileFound: state.profileFound,
      profileOwnerStatus: state.profileOwnerStatus,
      profileKycStatus: state.profileKycStatus,
    });
  }

  console.log(`[fetchDriverSearchVehicles] ${allRows.length} candidates → ${included.length} eligible`);
  return { rows: included, error: null };
}

function mapVehicleRowToSelfDriveResult(
  row: Row,
  ownerCity: string,
  ownerName: string
): SelfDriveResult {
  const vehicle = mapVehicleRow(row);
  const category = normalizeVehicleCategory(vehicle.vehicle_category);
  const pickupCity = resolveVehicleCity(row, ownerCity);
  const dailyRent = resolveDailyFare(row, category);
  const securityDeposit = resolveSecurityDeposit(row, category);
  const photos = vehicle.vehicle_photo_url ? [vehicle.vehicle_photo_url] : [];

  return {
    id: vehicle.id,
    booking_type: "self_drive",
    vehicle_id: vehicle.id,
    vehicle_name: buildVehicleDisplayName(row),
    vehicle_type: category,
    registration_number: maskRegistrationNumber(vehicle.registration_number),
    fuel_type: String(row.fuel_type ?? "").trim() || undefined,
    transmission: String(row.transmission ?? "").trim() || undefined,
    vehicle_year: Number(row.vehicle_year ?? 0) || undefined,
    has_ac: row.has_ac === undefined ? undefined : Boolean(row.has_ac),
    owner_name: ownerName || "Owner",
    owner_id: vehicle.owner_id ?? undefined,
    owner_city: pickupCity,
    pickup_city: pickupCity,
    drop_city: "",
    journey_date: "",
    journey_time: "",
    available_seats: Number(row.seating_capacity ?? row.seats ?? 4) || 4,
    price: dailyRent,
    status: "available",
    location: pickupCity,
    daily_rent: dailyRent,
    security_deposit: securityDeposit,
    availability: "available",
    photos,
    seats: Number(row.seating_capacity ?? row.seats ?? 4) || 4,
  };
}

function mapVehicleRowToDriverResult(
  row: Row,
  ownerCity: string,
  ownerName: string,
  ownerMobile: string
): DriverVehicleResult {
  const vehicle = mapVehicleRow(row);
  const category = normalizeVehicleCategory(vehicle.vehicle_category);
  const pickupCity = resolveVehicleCity(row, ownerCity);
  const ratePerKm = getNumber(row, "rate_per_km") || getNumber(row, "price_per_km") || 15;
  const photos = vehicle.vehicle_photo_url ? [vehicle.vehicle_photo_url] : [];

  return {
    id: vehicle.id,
    booking_type: "with_driver",
    vehicle_id: vehicle.id,
    vehicle_name: buildVehicleDisplayName(row),
    vehicle_number: maskRegistrationNumber(vehicle.registration_number),
    vehicle_type: category,
    photos,
    owner_name: ownerName || "Owner",
    owner_id: vehicle.owner_id,
    pickup_city: pickupCity,
    drop_city: "",
    journey_date: "",
    journey_time: "",
    available_seats: 4,
    price: ratePerKm,
    status: "available",
    driver_name: ownerName || "Owner Driver",
    driver_phone: ownerMobile || "9999999999",
    rate_per_km: ratePerKm,
    base_location: pickupCity,
    availability: "available",
    seats: 4,
  };
}

function mapVehicleRowToReturnJourneyResult(
  row: Row,
  ownerCity: string,
  ownerName: string,
  filters: { fromCity?: string; toCity?: string; date?: string }
): SearchResult {
  const vehicle = mapVehicleRow(row);
  const category = normalizeVehicleCategory(vehicle.vehicle_category);
  const pickupCity = resolveVehicleCity(row, ownerCity);
  const dailyFare = resolveDailyFare(row, category);
  const discountPercent = 30;
  const price = Math.round(dailyFare * (1 - discountPercent / 100));
  const photos = vehicle.vehicle_photo_url ? [vehicle.vehicle_photo_url] : [];
  const fromCity = filters.fromCity || pickupCity;
  const toCity = filters.toCity || pickupCity;

  return {
    id: vehicle.id,
    booking_type: "return_journey",
    vehicle_id: vehicle.id,
    vehicle_name: buildVehicleDisplayName(row),
    vehicle_number: maskRegistrationNumber(vehicle.registration_number),
    vehicle_type: category,
    photos,
    owner_name: ownerName || "Owner",
    from_city: fromCity,
    to_city: toCity,
    journey_date: filters.date ?? "",
    available_seats: 4,
    price,
    discount_percent: discountPercent,
    return_from_city: toCity,
    return_to_city: fromCity,
  };
}

function bucketTrend(rows: Row[], amountKey?: string): ChartPoint[] {
  const buckets = new Map<string, number>();
  rows.forEach((row) => {
    if (amountKey) {
      if (!countsTowardRevenue(row)) return;
      const amount = bookingRevenueAmount(row);
      if (amount <= 0) return;
      const key = getDateKey(row.created_at);
      buckets.set(key, (buckets.get(key) ?? 0) + amount);
      return;
    }
    const key = getDateKey(row.created_at);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([label, value]) => ({ label, value }));
}

export async function getPlatformStats(): Promise<PlatformStats> {
  noStore();
  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[getPlatformStats]", configError);
    return emptyStats(configError);
  }

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    users,
    registeredOwners,
    vehicleCounts,
    returnJourneys,
    selfDriveVehicles,
    driverVehicles,
    bookings,
    todaysBookings,
    bookingRows,
    recentVehiclesRows,
    recentOwnersRows,
    vehicleCategoryRows,
    ownerKycRecords,
    customerKycRecords,
    ownerList,
    ownerManagementList,
    customerManagementList,
    documentRows,
  ] = await Promise.all([
    countTable("users"),
    countRegisteredOwners(),
    getVehicleDashboardCounts(),
    countTable("return_journeys"),
    countTable("self_drive_vehicles"),
    countTable("driver_vehicles"),
    countTable("bookings"),
    countTable("bookings", { createdAfter: `${today}T00:00:00.000Z` }),
    selectRows(
      "bookings",
      "id, booking_type, amount, booking_status, payment_status, refund_status, created_at",
      500
    ),
    selectRows(
      "vehicles",
      "id, owner_id, vehicle_make, vehicle_model, vehicle_year, vehicle_name, vehicle_type, vehicle_category, registration_number, approval_status, vehicle_approval_status, created_at",
      8
    ),
    selectRecentOwnerUsers(8),
    selectRows("vehicles", "vehicle_category, vehicle_type, vehicle_name", 500),
    getAdminOwnerKycList(),
    getAdminCustomerKycList(),
    getAdminOwnerList(),
    getAdminOwnerManagementList(),
    getAdminCustomerManagementList(),
    selectRows("vehicles", "id, approval_status, documents_status", 500),
  ]);

  const revenue = sumBookingRevenue(bookingRows);
  const returnJourneyRevenue = bookingRows
    .filter((row) => getString(row, "booking_type", "return_journey") === "return_journey")
    .reduce((sum, row) => sum + bookingRevenueAmount(row), 0);
  const driverVehicleRevenue = bookingRows
    .filter((row) => getString(row, "booking_type") === "with_driver")
    .reduce((sum, row) => sum + bookingRevenueAmount(row), 0);
  const selfDriveRevenue = bookingRows
    .filter((row) => getString(row, "booking_type") === "self_drive")
    .reduce((sum, row) => sum + bookingRevenueAmount(row), 0);
  const monthlyRevenue = sumBookingRevenueSince(bookingRows, monthStart);
  const pendingOwnerKyc = ownerManagementList.filter((row) => row.kycStatus === "pending").length;
  const approvedOwnerKyc = ownerManagementList.filter((row) => row.kycStatus === "approved").length;
  const pendingCustomerKyc = customerManagementList.filter((row) => row.kycStatus === "pending").length;
  const pendingKyc = pendingOwnerKyc + pendingCustomerKyc;
  const approvedKyc = approvedOwnerKyc + customerManagementList.filter((row) => row.kycStatus === "approved").length;
  const vehicles = vehicleCounts.total;
  const approvedVehicles = vehicleCounts.approved;
  const pendingVehicles = vehicleCounts.pending;
  const rejectedVehicles = vehicleCounts.rejected;
  const pendingVehicleApprovals = documentRows.filter((row) => {
    const approvalPending = getString(row, "approval_status", "pending") === "pending";
    const docsPending =
      normalizeDocumentsStatus(getString(row, "documents_status", "pending")) === "pending";
    return approvalPending || docsPending;
  }).length;
  const pendingDocuments = documentRows.filter(
    (row) => normalizeDocumentsStatus(getString(row, "documents_status", "pending")) === "pending"
  ).length;
  const approvedDocuments = documentRows.filter(
    (row) => normalizeDocumentsStatus(getString(row, "documents_status", "pending")) === "approved"
  ).length;
  const pendingOwners = ownerManagementList.filter((row) => row.ownerStatus === "pending").length;
  const approvedOwners = ownerManagementList.filter((row) => row.ownerStatus === "approved").length;
  const rejectedOwners = ownerManagementList.filter((row) => row.ownerStatus === "rejected").length;
  const pendingCustomers = customerManagementList.filter(
    (row) => row.userStatus === "pending"
  ).length;
  const approvedCustomers = customerManagementList.filter(
    (row) => row.userStatus === "approved"
  ).length;
  const pendingApprovals = pendingVehicles + pendingKyc + pendingOwners + pendingCustomers;

  const pendingBookings = bookingRows.filter(
    (row) => getString(row, "booking_status", "pending").toLowerCase() === "pending"
  ).length;
  const cancelledBookings = bookingRows.filter((row) => {
    const status = getString(row, "booking_status", "").toLowerCase();
    return status === "cancelled" || status === "already_cancelled";
  }).length;
  const activeBookings = bookingRows.filter((row) => {
    const status = getString(row, "booking_status", "").toLowerCase();
    return status !== "cancelled" && status !== "already_cancelled" && status !== "completed";
  }).length;

  const categoryCounts = new Map<string, number>();
  vehicleCategoryRows.forEach((row) => {
    const type = getString(row, "vehicle_category", getString(row, "vehicle_type", "Unknown"));
    categoryCounts.set(type, (categoryCounts.get(type) ?? 0) + 1);
  });

  return {
    users,
    vehicleOwners: registeredOwners,
    vehicles,
    vehiclesTableCount: vehicles,
    approvedVehicles,
    pendingVehicles,
    rejectedVehicles,
    bookings,
    pendingBookings,
    cancelledBookings,
    activeBookings,
    returnJourneys,
    selfDriveVehicles,
    driverVehicles,
    todaysBookings,
    revenue,
    pendingApprovals,
    pendingKyc,
    approvedKyc,
    pendingDocuments,
    approvedDocuments,
    pendingOwners,
    approvedOwners,
    rejectedOwners,
    pendingOwnerKyc,
    approvedOwnerKyc,
    pendingCustomerKyc,
    pendingCustomers,
    approvedCustomers,
    pendingVehicleApprovals,
    returnJourneyRevenue,
    driverVehicleRevenue,
    selfDriveRevenue,
    monthlyRevenue,
    recentBookings: bookingRows.slice(0, 8).map((row) => ({
      id: getString(row, "id"),
      booking_type: getString(row, "booking_type", "return_journey"),
      amount: getNumber(row, "amount"),
      booking_status: getString(row, "booking_status", "pending"),
      created_at: getString(row, "created_at"),
    })) satisfies RecentBooking[],
    recentVehicles: recentVehiclesRows.map((row) => ({
      id: getString(row, "id"),
      vehicle_name: formatVehicleDisplayName(row),
      vehicle_type: getString(row, "vehicle_category", getString(row, "vehicle_type", "Unknown")),
      vehicle_number: getString(row, "registration_number", getString(row, "vehicle_number")),
      status: getVehicleApprovalStatus(row),
      created_at: getString(row, "created_at"),
    })) satisfies RecentVehicle[],
    recentOwners: recentOwnersRows.map((row) => ({
      id: getString(row, "id"),
      owner_name: getString(row, "name", getString(row, "owner_name", "Owner")),
      mobile: getString(row, "mobile"),
      verification_status: getString(row, "role", "owner"),
      created_at: getString(row, "created_at"),
    })) satisfies RecentOwner[],
    revenueTrend: bucketTrend(bookingRows, "amount"),
    bookingTrend: bucketTrend(bookingRows),
    vehicleCategoryDistribution: [...categoryCounts.entries()].map(([label, value]) => ({ label, value })),
    error: null,
  };
}

function emptyStats(error: string): PlatformStats {
  return {
    users: 0,
    vehicleOwners: 0,
    vehicles: 0,
    vehiclesTableCount: 0,
    approvedVehicles: 0,
    pendingVehicles: 0,
    rejectedVehicles: 0,
    bookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    activeBookings: 0,
    returnJourneys: 0,
    selfDriveVehicles: 0,
    driverVehicles: 0,
    todaysBookings: 0,
    revenue: 0,
    pendingApprovals: 0,
    pendingKyc: 0,
    approvedKyc: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    pendingOwners: 0,
    approvedOwners: 0,
    rejectedOwners: 0,
    pendingOwnerKyc: 0,
    approvedOwnerKyc: 0,
    pendingCustomerKyc: 0,
    pendingCustomers: 0,
    approvedCustomers: 0,
    pendingVehicleApprovals: 0,
    returnJourneyRevenue: 0,
    driverVehicleRevenue: 0,
    selfDriveRevenue: 0,
    monthlyRevenue: 0,
    recentBookings: [],
    recentVehicles: [],
    recentOwners: [],
    revenueTrend: [],
    bookingTrend: [],
    vehicleCategoryDistribution: [],
    error,
  };
}

export async function getVehicleOwners(): Promise<QueryResult<VehicleOwner[]>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { data: [], error: configError };
  }

  const { data, error } = await db()
    .from("vehicle_owners")
    .select(`
      *,
      user:users!vehicle_owners_owner_id_fkey ( name, email, mobile, city )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error)) {
      const owners = await selectRows("owners", "id, owner_name, mobile, email, address, verification_status, created_at", 100);
      return {
        data: owners.map((row) =>
          mapOwnerRow({
            id: row.id,
            name: row.owner_name,
            mobile: row.mobile,
            email: row.email,
            city: row.address,
            status: row.verification_status,
            created_at: row.created_at,
          })
        ),
        error: null,
      };
    }
    console.error("[getVehicleOwners]", error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => mapOwnerRow(row as Parameters<typeof mapOwnerRow>[0])),
    error: null,
  };
}

export async function searchVehicles(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  return searchReturnJourneys(filters);
}

export async function searchReturnJourneys(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
  tripType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { data: [], error: configError };
  }

  console.log("[searchReturnJourneys] filters:", JSON.stringify(filters));

  let query = db()
    .from("return_journeys")
    .select("*")
    .eq("status", "available")
    .gt("available_seats", 0)
    .order("journey_date", { ascending: true });

  if (filters.fromCity) query = query.ilike("from_city", `%${filters.fromCity}%`);
  if (filters.toCity) query = query.ilike("to_city", `%${filters.toCity}%`);
  if (filters.date) query = query.eq("journey_date", filters.date);
  const vehicleCategoryFilter = resolveVehicleCategoryDbFilter(filters.vehicleType);
  if (vehicleCategoryFilter) query = query.eq("vehicle_type", vehicleCategoryFilter);

  const { data, error } = await query;
  if (error) {
    console.error("[searchReturnJourneys]", error.message);
    return { data: [], error: error.message };
  }

  const journeyRows = asRows(data).filter(isPublicListing);
  const journeyVehicleIds = journeyRows.map((row) => getString(row, "vehicle_id")).filter(Boolean);
  let journeyVehicleQuery =
    journeyVehicleIds.length > 0
      ? db().from("vehicles").select("*").in("id", journeyVehicleIds)
      : null;
  if (journeyVehicleQuery) {
    journeyVehicleQuery = applyVehicleCategoryDbFilter(journeyVehicleQuery, filters.vehicleType);
  }
  const { data: journeyVehicles } = journeyVehicleQuery
    ? await journeyVehicleQuery
    : { data: [] };
  const journeyVehicleMap = new Map(
    asRows(journeyVehicles).map((row) => [String(row.id), row])
  );

  const tripTypeKey = resolveTripTypeKeyFromSearchLabel(filters.tripType ?? "One Way");

  const filteredJourneyRows = journeyRows.filter((row) => {
    const vehicleId = getString(row, "vehicle_id");
    if (!vehicleId) {
      if (vehicleCategoryFilter) {
        const journeyType = getString(row, "vehicle_type");
        return journeyType.localeCompare(vehicleCategoryFilter, undefined, {
          sensitivity: "accent",
        }) === 0;
      }
      return true;
    }
    const vehicle = journeyVehicleMap.get(vehicleId);
    if (!vehicle) return false;
    if (vehicleCategoryFilter && !vehicleRowMatchesTypeFilter(vehicle, filters.vehicleType)) {
      return false;
    }
    if (!isServiceEnabled(vehicle, "service_return_journey")) return false;
    return vehicleSupportsSearchTrip(vehicle, tripTypeKey);
  });

  const ownerIds = filteredJourneyRows.map((row) => getString(row, "owner_id")).filter(Boolean);
  const userMap = await getUserMap(ownerIds);

  let results: SearchResult[] = filteredJourneyRows.map((row) => {
    const vehicleId = getString(row, "vehicle_id");
    const vehicle = vehicleId ? journeyVehicleMap.get(vehicleId) ?? null : null;
    const owner = userMap.get(getString(row, "owner_id"));
    const vehicleName =
      getString(row, "vehicle_name") ||
      (vehicle ? buildVehicleDisplayName(vehicle) : "Vehicle");

    return {
      id: getString(row, "id"),
      booking_type: "return_journey" as const,
      vehicle_id: vehicleId,
      vehicle_name: vehicleName,
      vehicle_number: vehicle ? maskRegistrationNumber(getString(vehicle, "registration_number")) : undefined,
      vehicle_type: getString(row, "vehicle_type") || getString(vehicle, "vehicle_category", "-"),
      photos: vehicle?.vehicle_photo_url ? [String(vehicle.vehicle_photo_url)] : [],
      owner_name: resolveUserName(owner as { name?: string; full_name?: string }, "Owner"),
      from_city: getString(row, "pickup_city") || getString(row, "from_city"),
      to_city: getString(row, "drop_city") || getString(row, "to_city"),
      journey_date: getString(row, "journey_date"),
      journey_time: getString(row, "journey_time"),
      available_seats: getNumber(row, "available_seats"),
      price: getNumber(row, "price") || getNumber(row, "price_per_seat"),
      return_from_city: getString(row, "return_from_city") || undefined,
      return_to_city: getString(row, "return_to_city") || undefined,
      return_departure_time: getString(row, "return_departure_time") || undefined,
      discount_percent: getNumber(row, "discount_percent", 30) || undefined,
      driver_name: getString(row, "driver_name") || undefined,
      driver_phone: getString(row, "driver_phone") || undefined,
    };
  });

  const { rows: vehicleRows, error: vehicleError } = await fetchApprovedMarketplaceVehicles(
    "service_return_journey",
    filters.vehicleType
  );
  if (!vehicleError && vehicleRows.length > 0) {
    const vehicleOwnerIds = vehicleRows.map((row) => getString(row, "owner_id"));
    const [ownerCityMap, ownerNameMap] = await Promise.all([
      resolveOwnerCities(vehicleOwnerIds),
      resolveOwnerNames(vehicleOwnerIds),
    ]);

    const listedVehicleIds = new Set(
      results.map((r) => r.vehicle_id).filter(Boolean)
    );

    for (const row of vehicleRows) {
      const vehicleId = getString(row, "id");
      if (listedVehicleIds.has(vehicleId)) continue;
      if (!vehicleSupportsSearchTrip(row, tripTypeKey)) continue;

      const ownerId = getString(row, "owner_id");
      const ownerCity = ownerCityMap.get(ownerId) ?? "";
      const ownerName = ownerNameMap.get(ownerId) ?? "Owner";
      const pickupCity = resolveVehicleCity(row, ownerCity);

      if (filters.fromCity && !matchesCity(pickupCity, filters.fromCity)) continue;

      results.push(
        mapVehicleRowToReturnJourneyResult(row, ownerCity, ownerName, {
          fromCity: filters.fromCity || pickupCity,
          toCity: filters.toCity,
          date: filters.date,
        })
      );
    }
  }

  console.log("[searchReturnJourneys] final results:", results.length);
  return { data: results, error: null };
}

export async function searchSelfDriveVehicles(filters: {
  city?: string;
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  vehicleType?: string;
  tripType?: string;
}): Promise<QueryResult<SelfDriveResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: [], error: configError };

  const { rows, error } = await fetchSelfDriveSearchVehicles(filters.vehicleType);
  if (error) {
    return { data: [], error };
  }

  const ownerIds = rows.map((row) => getString(row, "owner_id"));
  const [ownerCityMap, ownerNameMap] = await Promise.all([
    resolveOwnerCities(ownerIds),
    resolveOwnerNames(ownerIds),
  ]);

  const cityFilter = filters.pickupCity ?? filters.city;
  const tripTypeKey = resolveTripTypeKeyFromSearchLabel(filters.tripType);

  const eligibleRows = rows.filter((row) => {
    if (!isServiceEnabled(row, "service_self_drive")) return false;
    if (!vehicleSupportsSearchTrip(row, tripTypeKey)) return false;
    return true;
  });

  let results = eligibleRows.map((row) => {
    const ownerId = getString(row, "owner_id");
    const ownerCity = ownerCityMap.get(ownerId) ?? "";
    const ownerName = ownerNameMap.get(ownerId) ?? "Owner";
    return mapVehicleRowToSelfDriveResult(row, ownerCity, ownerName);
  });

  const strictEnvOnly = process.env.SEARCH_SELF_DRIVE_STRICT_FILTERS === "0";

  if (!strictEnvOnly && cityFilter) {
    results = results.filter((result) => matchesCity(result.pickup_city, cityFilter));
  }

  if (!strictEnvOnly && filters.date) {
    results = results.filter((r) => !r.journey_date || r.journey_date === filters.date);
  }

  return { data: results, error: null };
}

export async function searchDriverVehicles(filters: {
  city?: string;
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  tripType?: string;
  vehicleType?: string;
}): Promise<QueryResult<DriverVehicleResult[]>> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: [], error: configError };

  const serviceKey: VehicleServiceKey =
    filters.tripType === "Local Rental" ? "service_local_rental" : "service_with_driver";

  console.log("[searchDriverVehicles] service:", serviceKey, "filters:", JSON.stringify(filters));

  const { rows, error } = await fetchDriverSearchVehicles(serviceKey, filters.vehicleType);
  if (error) {
    console.error("[searchDriverVehicles] query error:", error);
    return { data: [], error };
  }

  const ownerIds = rows.map((row) => getString(row, "owner_id"));
  const [ownerCityMap, ownerNameMap, ownerMobileMap] = await Promise.all([
    resolveOwnerCities(ownerIds),
    resolveOwnerNames(ownerIds),
    resolveOwnerMobiles(ownerIds),
  ]);

  const pickupCity = filters.pickupCity ?? filters.city;
  const tripTypeKey = resolveTripTypeKeyFromSearchLabel(filters.tripType);
  const searchFilters = {
    pickupCity,
    dropCity: filters.dropCity,
    date: filters.date,
    vehicleType: filters.vehicleType,
    tripType: filters.tripType,
    tripTypeKey,
  };

  const results: DriverVehicleResult[] = [];
  const postRejections: { registration: string; reasons: string[] }[] = [];

  for (const row of rows) {
    const ownerId = getString(row, "owner_id");
    const ownerCity = ownerCityMap.get(ownerId) ?? "";

    const postReasons = evaluateDriverVehicleSearchFilters({
      row,
      ownerCity,
      filters: searchFilters,
    });

    if (postReasons.length > 0) {
      logDriverVehicleExclusion(row, postReasons);
      postRejections.push({
        registration: String(row.registration_number ?? row.id),
        reasons: postReasons,
      });
      continue;
    }

    results.push(
      mapVehicleRowToDriverResult(
        row,
        ownerCity,
        ownerNameMap.get(ownerId) ?? "Owner",
        ownerMobileMap.get(ownerId) ?? ""
      )
    );
  }

  if (postRejections.length > 0) {
    console.log("[searchDriverVehicles] post-filter rejections:", postRejections);
    logDriverSearchSummary({
      matched: results.length,
      rejected: postRejections.length,
      rejections: postRejections,
    });
  }

  const sorted = sortDriverResultsByPickupProximity(results, pickupCity);

  console.log("[searchDriverVehicles] final results:", sorted.length);
  logDriverSearchResultsTable(sorted);

  return { data: sorted, error: null };
}

export async function getJourneyById(id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db()
    .from("return_journeys")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (data) {
    const journey = data as Row;
    const vehicleId = getString(journey, "vehicle_id");
    const ownerId = getString(journey, "owner_id");

    const [vehicleMap, legacyVehicleMap, userMap] = await Promise.all([
      getVehicleMap([vehicleId]),
      getLegacyVehicleOwnerMap([vehicleId]),
      getUserMap([ownerId]),
    ]);

    const vehicle = vehicleMap.get(vehicleId) ?? legacyVehicleMap.get(vehicleId) ?? null;
    const owner = userMap.get(ownerId) ?? null;

    return {
      ...journey,
      vehicle,
      owner: owner
        ? {
            id: getString(owner, "id", ownerId),
            name: resolveUserName(owner as { name?: string; full_name?: string }, "Owner"),
            email: getString(owner, "email"),
          }
        : { id: ownerId, name: "Owner" },
    };
  }

  if (error && !isMissingTableError(error)) {
    console.error("[getJourneyById]", error.message);
  }

  const { data: vehicleData } = await db()
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (
    !vehicleData ||
    !isVehicleMarketplaceApproved(vehicleData as Row) ||
    !isServiceEnabled(vehicleData as Row, "service_return_journey")
  ) {
    return null;
  }

  const row = vehicleData as Row;
  const ownerId = getString(row, "owner_id");
  const eligibilityMap = await getOwnerMarketplaceEligibilityMap([ownerId]);
  if (!isVehicleCustomerVisible(row, ownerId, eligibilityMap)) {
    return null;
  }

  const [ownerCityMap, ownerNameMap] = await Promise.all([
    resolveOwnerCities([ownerId]),
    resolveOwnerNames([ownerId]),
  ]);
  const returnDeal = mapVehicleRowToReturnJourneyResult(
    row,
    ownerCityMap.get(ownerId) ?? "",
    ownerNameMap.get(ownerId) ?? "Owner",
    {}
  );

  return {
    id: returnDeal.id,
    vehicle_id: returnDeal.vehicle_id,
    owner_id: ownerId,
    vehicle_name: returnDeal.vehicle_name,
    vehicle_type: returnDeal.vehicle_type,
    from_city: returnDeal.from_city,
    to_city: returnDeal.to_city,
    pickup_city: returnDeal.from_city,
    drop_city: returnDeal.to_city,
    journey_date: returnDeal.journey_date,
    available_seats: returnDeal.available_seats,
    price: returnDeal.price,
    price_per_seat: returnDeal.price,
    discount_percent: returnDeal.discount_percent,
    status: "available",
    vehicle: row,
    owner: { id: ownerId, name: returnDeal.owner_name },
  };
}

export async function getSelfDriveListingById(id: string): Promise<SelfDriveResult | null> {
  const { data, error } = await db()
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getSelfDriveListingById]", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as Row;
  if (
    !isVehicleMarketplaceApproved(row) ||
    !isVehicleSearchActive(row) ||
    !passesSelfDriveService(row)
  ) {
    return null;
  }

  const ownerId = getString(row, "owner_id");
  const [ownerCityMap, ownerNameMap] = await Promise.all([
    resolveOwnerCities([ownerId]),
    resolveOwnerNames([ownerId]),
  ]);

  const result = mapVehicleRowToSelfDriveResult(
    row,
    ownerCityMap.get(ownerId) ?? "",
    ownerNameMap.get(ownerId) ?? "Owner"
  );

  return {
    ...result,
    owner_id: ownerId || result.owner_id,
  };
}

export async function getDriverListingById(id: string): Promise<DriverVehicleResult | null> {
  const { data, error } = await db()
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getDriverListingById]", error.message);
    return null;
  }
  if (!data || !isVehicleMarketplaceApproved(data as Row)) return null;

  const row = data as Row;
  if (!isServiceEnabled(row, "service_with_driver") && !isServiceEnabled(row, "service_local_rental")) {
    return null;
  }

  const ownerId = getString(row, "owner_id");
  const eligibilityMap = await getOwnerMarketplaceEligibilityMap([ownerId]);
  if (!isVehicleCustomerVisible(row, ownerId, eligibilityMap)) return null;

  const [ownerCityMap, ownerNameMap, ownerMobileMap] = await Promise.all([
    resolveOwnerCities([ownerId]),
    resolveOwnerNames([ownerId]),
    resolveOwnerMobiles([ownerId]),
  ]);

  return mapVehicleRowToDriverResult(
    row,
    ownerCityMap.get(ownerId) ?? "",
    ownerNameMap.get(ownerId) ?? "Owner",
    ownerMobileMap.get(ownerId) ?? ""
  );
}

export async function getVehicleListingById(id: string): Promise<VehicleDetail | null> {
  const journey = await getJourneyById(id);
  if (journey) {
    const vehicle = journey.vehicle as Row | null;
    const owner = journey.owner as Row | null;
    return {
      id: getString(journey, "id"),
      module: "return_journey",
      booking_type: "return_journey",
      vehicle_id: getString(journey, "vehicle_id"),
      vehicle_name:
        getString(journey, "vehicle_name") ||
        getString(vehicle, "vehicle_name") ||
        getString(vehicle, "vehicle_model") ||
        getString(vehicle, "vehicle_number", "Vehicle"),
      vehicle_type: getString(journey, "vehicle_type") || getString(vehicle, "vehicle_type", "-"),
      owner_name: getString(owner, "name", "Owner"),
      from_city: getString(journey, "pickup_city") || getString(journey, "from_city"),
      to_city: getString(journey, "drop_city") || getString(journey, "to_city"),
      journey_date: getString(journey, "journey_date"),
      journey_time: getString(journey, "journey_time"),
      available_seats: getNumber(journey, "available_seats"),
      price: getNumber(journey, "price") || getNumber(journey, "price_per_seat"),
      price_label: "per seat",
    };
  }

  const driver = await getDriverListingById(id);
  if (driver) return { ...driver, module: "with_driver", price_label: "full vehicle" };

  const selfDrive = await getSelfDriveListingById(id);
  if (selfDrive) return { ...selfDrive, module: "self_drive", price_label: "per day" };

  return null;
}

export async function getBookingConfirmationById(id: string): Promise<BookingConfirmation | null> {
  const row = await selectBookingById(id);
  if (!row) return null;
  const cancelled = getString(row, "booking_status").toLowerCase() === "cancelled";

  let refundTransactionId: string | undefined;
  if (cancelled) {
    const { data: refundRow } = await db()
      .from("refunds")
      .select("transaction_id")
      .eq("booking_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const value = getString(refundRow as Row | null, "transaction_id");
    if (value) refundTransactionId = value;
  }

  const protection = deriveProtectionFields(row);
  return {
    id: getString(row, "id"),
    booking_reference: getString(row, "booking_reference") || undefined,
    booking_type: getString(row, "booking_type", "return_journey"),
    passenger_name: getString(row, "passenger_name", "Passenger"),
    mobile: getString(row, "mobile"),
    amount: getNumber(row, "amount"),
    booking_status: getString(row, "booking_status", "pending"),
    payment_status: getString(row, "payment_status", "pending"),
    pickup_location: getString(row, "pickup_location") || undefined,
    drop_location: getString(row, "drop_location") || undefined,
    pickup_date: getString(row, "pickup_date") || undefined,
    pickup_time: getString(row, "pickup_time") || undefined,
    trip_type: getString(row, "trip_type") || undefined,
    vehicle_id: getString(row, "vehicle_id") || undefined,
    owner_id: getString(row, "owner_id") || undefined,
    user_id: getString(row, "user_id") || undefined,
    created_at: getString(row, "created_at"),
    ...protection,
    trip_fare_amount: getNumber(row, "trip_fare_amount") || undefined,
    security_deposit_amount: getNumber(row, "security_deposit_amount") || undefined,
    base_fare: getNumber(row, "base_fare") || undefined,
    platform_fee: getNumber(row, "platform_fee") || undefined,
    discount_amount: getNumber(row, "discount_amount") || undefined,
    special_instructions: getString(row, "special_instructions") || undefined,
    advance_amount: getNumber(row, "advance_amount") || undefined,
    balance_amount: getNumber(row, "balance_amount") || undefined,
    amount_paid: getNumber(row, "amount_paid") || undefined,
    amount_due: getNumber(row, "amount_due") || undefined,
    deposit_refund_amount: getNumber(row, "deposit_refund_amount") || undefined,
    deposit_refund_status: getString(row, "deposit_refund_status") || undefined,
    cancelled_at: getString(row, "cancelled_at") || undefined,
    refund_amount: getNumber(row, "refund_amount") || undefined,
    refund_status: getString(row, "refund_status") || undefined,
    refund_processed_at: getString(row, "refund_processed_at") || undefined,
    cancellation_reason:
      getString(row, "cancellation_reason") || getString(row, "cancel_reason") || undefined,
    cancellation_reason_category: getString(row, "cancellation_reason_category") || undefined,
    cancellation_charges: getNumber(row, "cancellation_charges") || undefined,
    cancelled_by_role: getString(row, "cancelled_by_role") || undefined,
    refund_trip_fare_amount: getNumber(row, "refund_trip_fare_amount") || undefined,
    refund_deposit_amount: getNumber(row, "refund_deposit_amount") || undefined,
    refund_transaction_id: refundTransactionId,
  };
}

export async function getAdminRows(table: string, columns = "*", limit = 50): Promise<Row[]> {
  return selectRows(table, columns, limit);
}

async function getUserNameMap(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await db()
    .from("users")
    .select("id, name, email")
    .in("id", uniqueIds);

  const map = new Map<string, string>();
  if (!error) {
    asRows(data).forEach((row) => {
      map.set(getString(row, "id"), resolveUserName(row));
    });
  }

  for (const id of uniqueIds) {
    if (map.has(id)) continue;
    const { data: authData } = await db().auth.admin.getUserById(id);
    const authUser = authData.user;
    if (!authUser) continue;
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    map.set(
      id,
      String(meta.name ?? meta.full_name ?? authUser.email ?? "User").trim() || "User"
    );
  }

  return map;
}

function ownerStatusFromKyc(kycStatus: string): string {
  if (kycStatus === "verified") return "approved";
  if (kycStatus === "rejected") return "rejected";
  if (kycStatus === "pending") return "pending";
  return "registered";
}

function maskAadhaar(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 4) return `XXXX-XXXX-${digits.slice(-4)}`;
  return value.trim() || "Not provided";
}

function isPendingKycStatus(status: string): boolean {
  return ["pending", "not_submitted", "registered"].includes(status.toLowerCase());
}

function isApprovedKycStatus(status: string): boolean {
  return ["verified", "approved"].includes(status.toLowerCase());
}

function normalizeKycDisplayStatus(status: string): string {
  const value = status.toLowerCase();
  if (value === "verified") return "approved";
  if (value === "not_submitted") return "registered";
  return value || "registered";
}

function resolveOwnerStatus(row: Row | undefined, kycStatus: string): OwnerStatus {
  return normalizeOwnerStatus(getString(row, "owner_status"), kycStatus);
}

async function getOwnerStatusMap(ownerIds: string[]): Promise<Map<string, OwnerStatus>> {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await db()
    .from("users")
    .select("id, owner_status, kyc_status")
    .in("id", uniqueIds);

  const map = new Map<string, OwnerStatus>();
  if (!error) {
    asRows(data).forEach((row) => {
      map.set(getString(row, "id"), resolveOwnerStatus(row, getString(row, "kyc_status")));
    });
  }

  for (const id of uniqueIds) {
    if (map.has(id)) continue;
    map.set(id, "pending");
  }

  return map;
}

async function getOwnerMarketplaceEligibilityMap(ownerIds: string[]) {
  const uniqueIds = [...new Set(ownerIds.filter(Boolean))];
  const map = new Map<string, ReturnType<typeof ownerMarketplaceEligibilityFromRow>>();
  if (uniqueIds.length === 0) return map;

  const { resolveCanonicalOwnerUserId } = await import("@/lib/services/owner-approval-sync");
  const canonicalByOriginal = new Map<string, string>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      canonicalByOriginal.set(id, await resolveCanonicalOwnerUserId(id));
    })
  );

  const canonicalIds = [...new Set([...canonicalByOriginal.values()])];

  const [profileResult, userResult] = await Promise.all([
    db()
      .from("owner_profiles")
      .select("user_id, owner_status, kyc_status")
      .in("user_id", canonicalIds),
    db()
      .from("users")
      .select("id, owner_status, kyc_status")
      .in("id", canonicalIds),
  ]);

  let profileRows = asRows(profileResult.data);
  if (profileResult.error) {
    if (isMissingColumnError(profileResult.error)) {
      const retry = await db().from("owner_profiles").select("user_id").in("user_id", canonicalIds);
      profileRows = asRows(retry.data);
    } else if (!isMissingTableError(profileResult.error)) {
      console.warn("[getOwnerMarketplaceEligibilityMap] owner_profiles:", profileResult.error.message);
    }
  }

  let userRows = asRows(userResult.data);
  if (userResult.error) {
    if (isMissingColumnError(userResult.error)) {
      const kycRetry = await db().from("users").select("id, kyc_status").in("id", canonicalIds);
      if (!kycRetry.error) {
        userRows = asRows(kycRetry.data);
      } else {
        const idRetry = await db().from("users").select("id").in("id", canonicalIds);
        userRows = asRows(idRetry.data);
      }
    } else if (!isMissingTableError(userResult.error)) {
      console.warn("[getOwnerMarketplaceEligibilityMap] users:", userResult.error.message);
    }
  }

  const profileMap = new Map(profileRows.map((row) => [getString(row, "user_id"), row]));
  const userMap = new Map(userRows.map((row) => [getString(row, "id"), row]));

  for (const id of uniqueIds) {
    const canonicalId = canonicalByOriginal.get(id) ?? id;
    const profile = profileMap.get(canonicalId);
    const user = userMap.get(canonicalId);
    const ownerStatus = ownerStatusFromRow(profile, user);
    const kycStatus = resolveOwnerKycAdminStatus({
      profileKyc: getString(profile, "kyc_status") || undefined,
      userKyc: getString(user, "kyc_status") || undefined,
    });
    map.set(id, {
      ownerStatus,
      kycStatus,
      ownerApproved: ownerStatus === "approved",
      kycApproved: isOwnerKycApproved(kycStatus),
    });
  }

  return map;
}

function getVehicleDocumentsStatus(row: Row) {
  return normalizeDocumentsStatus(getString(row, "documents_status", "pending"));
}

function isVehicleCustomerVisible(row: Row, ownerId: string, eligibilityMap: Map<string, ReturnType<typeof ownerMarketplaceEligibilityFromRow>>) {
  const eligibility = eligibilityMap.get(ownerId) ?? ownerMarketplaceEligibilityFromRow({});
  return isVehicleCustomerListable({
    ownerStatus: eligibility.ownerStatus,
    kycStatus: eligibility.kycStatus,
    vehicleApprovalStatus: getVehicleApprovalStatus(row),
    documentsStatus: getVehicleDocumentsStatus(row),
  });
}

async function getVehicleDashboardCounts(): Promise<{
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}> {
  const rows = await selectRows(
    "vehicles",
    "id, owner_id, approval_status, vehicle_approval_status, documents_status",
    500
  );
  const ownerIds = rows.map((row) => getString(row, "owner_id")).filter(Boolean);
  const eligibilityMap = await getOwnerMarketplaceEligibilityMap(ownerIds);

  let approved = 0;
  let pending = 0;
  let rejected = 0;

  rows.forEach((row) => {
    const ownerId = getString(row, "owner_id");
    const eligibility = eligibilityMap.get(ownerId) ?? ownerMarketplaceEligibilityFromRow({});
    const stat = effectiveVehicleStat(
      getVehicleApprovalStatus(row),
      eligibility.ownerStatus,
      eligibility.kycStatus,
      getVehicleDocumentsStatus(row)
    );
    if (stat === "approved") approved += 1;
    else if (stat === "rejected") rejected += 1;
    else pending += 1;
  });

  return { total: rows.length, approved, pending, rejected };
}

export async function assertOwnerApprovedForVehicle(
  ownerId: string,
  vehicleId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { fetchBookingOwnerProfileState } = await import("@/lib/services/owner-approval-sync");
  const state = await fetchBookingOwnerProfileState(vehicleId, ownerId);
  const blocked = vehicleApprovalBlockedReason({
    ownerStatus: state.ownerStatus,
    kycStatus: state.kycStatus,
  });

  if (blocked) {
    return { ok: false, error: blocked };
  }

  return { ok: true };
}

/** All platform users — merges auth.users with public.users (same source as dashboard). */
export async function getAdminUserList(limit = 500): Promise<AdminUserRecord[]> {
  const [{ data: authData, error: authError }, profileRows] = await Promise.all([
    db().auth.admin.listUsers({ page: 1, perPage: 1000 }),
    selectRows(
      "users",
      "id, name, email, mobile, role, is_blocked, kyc_status, owner_status, created_at",
      limit
    ),
  ]);

  if (authError) {
    console.error("[getAdminUserList]", authError.message);
  }

  const profileMap = new Map(profileRows.map((row) => [getString(row, "id"), row]));
  const seen = new Set<string>();
  const results: AdminUserRecord[] = [];

  for (const authUser of authData?.users ?? []) {
    seen.add(authUser.id);
    const profile = profileMap.get(authUser.id);
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const role =
      normalizeRole(getString(profile, "role") || meta.role) ?? ("rider" satisfies UserRole);
    const isBlockedProfile = Boolean(profile?.is_blocked);
    const isBanned =
      Boolean(authUser.banned_until) && new Date(String(authUser.banned_until)) > new Date();

    results.push({
      id: authUser.id,
      name:
        getString(profile, "name") ||
        String(meta.name ?? meta.full_name ?? authUser.email ?? "User").trim() ||
        "User",
      email: authUser.email ?? getString(profile, "email"),
      mobile: getString(profile, "mobile") || String(meta.mobile ?? ""),
      role,
      kyc_status: getString(profile, "kyc_status", "not_submitted"),
      is_blocked: isBlockedProfile || isBanned,
      created_at: getString(profile, "created_at") || authUser.created_at || "",
      verified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
      lastLogin: authUser.last_sign_in_at ?? "",
      status: isBlockedProfile || isBanned ? "Blocked" : "Active",
    });
  }

  for (const profile of profileRows) {
    const id = getString(profile, "id");
    if (seen.has(id)) continue;
    const role = normalizeRole(getString(profile, "role")) ?? ("rider" satisfies UserRole);
    results.push({
      id,
      name: resolveUserName(profile),
      email: getString(profile, "email"),
      mobile: getString(profile, "mobile"),
      role,
      kyc_status: getString(profile, "kyc_status", "not_submitted"),
      is_blocked: Boolean(profile.is_blocked),
      created_at: getString(profile, "created_at"),
      verified: false,
      lastLogin: "",
      status: profile.is_blocked ? "Blocked" : "Active",
    });
  }

  return results.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

/** Registered owners — public.users with role owner, plus vehicle owners missing from users. */
export async function getAdminOwnerList(): Promise<AdminOwnerRecord[]> {
  const [allUsers, vehicleRows, profileRows, userStatusRows] = await Promise.all([
    getAdminUserList(),
    selectRows("vehicles", "owner_id", 500),
    selectOwnerProfilesForAdmin(500),
    selectRows("users", "id, owner_status, kyc_status, role", 500),
  ]);

  const userStatusMap = new Map(userStatusRows.map((row) => [getString(row, "id"), row]));

  const vehicleCountByOwner = new Map<string, number>();
  vehicleRows.forEach((row) => {
    const ownerId = getString(row, "owner_id");
    if (!ownerId) return;
    vehicleCountByOwner.set(ownerId, (vehicleCountByOwner.get(ownerId) ?? 0) + 1);
  });

  const profileMap = new Map(
    profileRows.map((row) => [getString(row, "user_id"), row])
  );
  const userById = new Map(allUsers.map((user) => [user.id, user]));
  const seen = new Set<string>();
  const owners: AdminOwnerRecord[] = [];

  for (const user of allUsers) {
    if (user.role !== "owner") continue;
    seen.add(user.id);
    const profile = profileMap.get(user.id);
    const statusRow = userStatusMap.get(user.id);
    owners.push({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      city: getString(profile, "city", getString(profile, "address")),
      status: normalizeProfileStatus(getString(profile, "owner_status"), "pending"),
      vehicleCount: vehicleCountByOwner.get(user.id) ?? 0,
      created_at: user.created_at,
    });
  }

  for (const [ownerId, vehicleCount] of vehicleCountByOwner) {
    if (seen.has(ownerId)) continue;
    const user = userById.get(ownerId);
    const profile = profileMap.get(ownerId);
    const statusRow = userStatusMap.get(ownerId);
    owners.push({
      id: ownerId,
      name: user?.name ?? "Owner",
      email: user?.email ?? "-",
      mobile: user?.mobile ?? "-",
      city: getString(profile, "city", getString(profile, "address")),
      status: resolveOwnerStatus(statusRow, user?.kyc_status ?? "pending"),
      vehicleCount,
      created_at: user?.created_at ?? "",
    });
  }

  return owners.sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

/** All owner vehicles from public.vehicles — uses select * to avoid missing-column failures. */
export async function getAdminVehicleList(limit = 200): Promise<AdminVehicleRecord[]> {
  const { data, error } = await db()
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[getAdminVehicleList]", error.message);
    return [];
  }

  const rows = asRows(data);
  const ownerIds = rows.map((row) => getString(row, "owner_id")).filter(Boolean);
  const [ownerNames, eligibilityMap] = await Promise.all([
    getUserNameMap(ownerIds),
    getOwnerMarketplaceEligibilityMap(ownerIds),
  ]);

  return rows.map((row) => {
    const mapped = mapVehicleRow(row);
    const eligibility = eligibilityMap.get(mapped.owner_id) ?? ownerMarketplaceEligibilityFromRow({});
    const canApprove =
      eligibility.ownerStatus === "approved" && eligibility.kycStatus === "approved";
    const approvalBlockedReason = vehicleApprovalBlockedReason({
      ownerStatus: eligibility.ownerStatus,
      kycStatus: eligibility.kycStatus,
    });
    return {
      id: mapped.id,
      vehicle_name: formatVehicleDisplayName(row),
      vehicle_category: mapped.vehicle_category,
      registration_number: mapped.registration_number,
      approval_status: mapped.approval_status,
      documents_status: mapped.documents_status ?? "pending",
      owner_id: mapped.owner_id,
      owner_name: ownerNames.get(mapped.owner_id) ?? "Owner",
      owner_status: eligibility.ownerStatus,
      kyc_status: eligibility.kycStatus,
      canApprove,
      approvalBlockedReason,
      vehicle_photo_url: mapped.vehicle_photo_url ?? null,
      rc_document_url: mapped.rc_document_url ?? null,
      insurance_document_url: mapped.insurance_document_url ?? null,
      service_self_drive: mapped.service_self_drive ?? true,
      service_with_driver: mapped.service_with_driver ?? true,
      service_local_rental: mapped.service_local_rental ?? true,
      service_return_journey: mapped.service_return_journey ?? false,
      trip_one_way: mapped.trip_one_way ?? true,
      trip_round_trip: mapped.trip_round_trip ?? true,
      trip_multi_city: mapped.trip_multi_city ?? false,
      trip_airport_transfer: mapped.trip_airport_transfer ?? false,
      trip_local_rental: mapped.trip_local_rental ?? true,
      created_at: getString(row, "created_at"),
    };
  });
}

export async function getApprovalLogsForEntity(
  entityId: string,
  limit = 50
): Promise<import("@/types/database").ApprovalLogRecord[]> {
  const { data, error } = await db()
    .from("approval_logs")
    .select("id, entity_type, entity_id, action, approved_by, remarks, created_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[getApprovalLogsForEntity]", error.message);
    return [];
  }

  const rows = asRows(data);
  const approverIds = rows
    .map((row) => getString(row, "approved_by"))
    .filter(Boolean);
  const approverNames = await getUserNameMap(approverIds);

  return rows.map((row) => ({
    id: getString(row, "id"),
    entity_type: getString(row, "entity_type"),
    entity_id: getString(row, "entity_id"),
    action: getString(row, "action"),
    approved_by: getString(row, "approved_by") || null,
    approver_name: approverNames.get(getString(row, "approved_by")) ?? "Admin",
    remarks: getString(row, "remarks") || null,
    created_at: getString(row, "created_at"),
  }));
}

/** Single vehicle for admin detail view — includes photos and approval history. */
export async function getAdminVehicleDetail(
  vehicleId: string
): Promise<import("@/types/database").AdminVehicleDetailRecord | null> {
  const { data, error } = await db().from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const mapped = mapVehicleRow(row);
  const [ownerNames, eligibilityMap, images, approvalLogs] = await Promise.all([
    getUserNameMap([mapped.owner_id]),
    getOwnerMarketplaceEligibilityMap([mapped.owner_id]),
    getVehicleImages(vehicleId),
    getApprovalLogsForEntity(vehicleId),
  ]);

  const eligibility = eligibilityMap.get(mapped.owner_id) ?? ownerMarketplaceEligibilityFromRow({});
  const canApprove =
    eligibility.ownerStatus === "approved" && eligibility.kycStatus === "approved";
  const approvalBlockedReason = vehicleApprovalBlockedReason({
    ownerStatus: eligibility.ownerStatus,
    kycStatus: eligibility.kycStatus,
  });

  const photoUrls = [
    ...(mapped.vehicle_photo_url ? [mapped.vehicle_photo_url] : []),
    ...images.filter((url) => url !== mapped.vehicle_photo_url),
  ];

  return {
    id: mapped.id,
    vehicle_name: formatVehicleDisplayName(row),
    vehicle_category: mapped.vehicle_category,
    registration_number: mapped.registration_number,
    approval_status: mapped.approval_status,
    documents_status: mapped.documents_status ?? "pending",
    owner_id: mapped.owner_id,
    owner_name: ownerNames.get(mapped.owner_id) ?? "Owner",
    owner_status: eligibility.ownerStatus,
    kyc_status: eligibility.kycStatus,
    canApprove,
    approvalBlockedReason,
    vehicle_photo_url: mapped.vehicle_photo_url ?? null,
    rc_document_url: mapped.rc_document_url ?? null,
    insurance_document_url: mapped.insurance_document_url ?? null,
    service_self_drive: mapped.service_self_drive ?? true,
    service_with_driver: mapped.service_with_driver ?? true,
    service_local_rental: mapped.service_local_rental ?? true,
    service_return_journey: mapped.service_return_journey ?? false,
    trip_one_way: mapped.trip_one_way ?? true,
    trip_round_trip: mapped.trip_round_trip ?? true,
    trip_multi_city: mapped.trip_multi_city ?? false,
    trip_airport_transfer: mapped.trip_airport_transfer ?? false,
    trip_local_rental: mapped.trip_local_rental ?? true,
    vehicle_make: mapped.vehicle_make,
    vehicle_model: mapped.vehicle_model,
    vehicle_year: mapped.vehicle_year,
    fuel_type: String(row.fuel_type ?? "-"),
    transmission: String(row.transmission ?? "-"),
    seating_capacity: Number(row.seating_capacity ?? row.seats ?? 0),
    ac: row.ac === undefined ? Boolean(row.is_ac) : Boolean(row.ac),
    city: mapped.city ?? null,
    daily_fare: mapped.daily_fare ?? 0,
    security_deposit: mapped.security_deposit ?? 0,
    images: photoUrls,
    created_at: mapped.created_at ?? "",
    updated_at: mapped.updated_at ?? "",
    approval_logs: approvalLogs,
  };
}

/** Owner KYC — merges owner profiles, users, owner_kyc, and vehicle_owners fallback. */
export async function getAdminOwnerKycList(): Promise<AdminOwnerKycRecord[]> {
  const [owners, ownerProfiles, kycRows, legacyOwners, userRows] = await Promise.all([
    getAdminOwnerList(),
    selectRows(
      "owner_profiles",
      "user_id, aadhaar_number, license_number, pan_number, city, address, aadhaar_document_url, license_document_url, selfie_document_url, address_proof_url, kyc_submitted_at",
      500
    ),
    selectRows("owner_kyc", "id, owner_id, aadhaar_url, pan_url, license_url, rc_url, insurance_url, selfie_url, status", 500),
    selectRows("vehicle_owners", "owner_id, name, mobile, email, aadhaar_number, license_number, status", 500),
    selectRows("users", "id, kyc_status", 500),
  ]);

  const profileMap = new Map(ownerProfiles.map((row) => [getString(row, "user_id"), row]));
  const kycMap = new Map(kycRows.map((row) => [getString(row, "owner_id"), row]));
  const legacyMap = new Map(
    legacyOwners.map((row) => [getString(row, "owner_id", getString(row, "id")), row])
  );
  const userKycMap = new Map(userRows.map((row) => [getString(row, "id"), getString(row, "kyc_status")]));

  return owners.map((owner) => {
    const profile = profileMap.get(owner.id);
    const kyc = kycMap.get(owner.id);
    const legacy = legacyMap.get(owner.id);
    const aadhaarNumber = getString(
      profile,
      "aadhaar_number",
      getString(legacy, "aadhaar_number")
    );
    const licenseNumber = getString(
      profile,
      "license_number",
      getString(legacy, "license_number")
    );
    const userKycStatus = userKycMap.get(owner.id) ?? "pending";
    const kycRowStatus = kyc ? getString(kyc, "status", userKycStatus) : userKycStatus;

    const profileRow = profile
      ? {
          user_id: owner.id,
          aadhaar_document_url: getString(profile, "aadhaar_document_url") || null,
          license_document_url: getString(profile, "license_document_url") || null,
          selfie_document_url: getString(profile, "selfie_document_url") || null,
          address_proof_url: getString(profile, "address_proof_url") || null,
          aadhaar_number: getString(profile, "aadhaar_number") || null,
          license_number: getString(profile, "license_number") || null,
          kyc_submitted_at: getString(profile, "kyc_submitted_at") || null,
        }
      : null;

    const legacyDocs = {
      aadhaar: getString(kyc, "aadhaar_url") || undefined,
      license: getString(kyc, "license_url") || undefined,
      selfie: getString(kyc, "selfie_url") || undefined,
      pan: getString(kyc, "pan_url") || undefined,
      rc: getString(kyc, "rc_url") || undefined,
      insurance: getString(kyc, "insurance_url") || undefined,
    };

    const documents = ownerProfileDocumentsToSet(profileRow, legacyDocs);
    const canApprove = ownerKycCanApprove(documents);

    return {
      id: owner.id,
      kycRecordId: kyc ? getString(kyc, "id") : null,
      name: owner.name,
      email: owner.email,
      mobile: owner.mobile,
      aadhaar: aadhaarNumber
        ? maskAadhaar(aadhaarNumber)
        : documents.aadhaar
          ? "Document uploaded"
          : "Not provided",
      license: licenseNumber || (documents.license ? "Document uploaded" : "Not provided"),
      status: normalizeOwnerStatus(kycRowStatus, userKycStatus),
      canApprove,
      documents,
    };
  });
}

/** Customer / rider KYC — from users + customer_kyc table fallback. */
export async function getAdminCustomerKycList(): Promise<AdminCustomerKycRecord[]> {
  const [allUsers, kycRows] = await Promise.all([
    getAdminUserList(500),
    selectRows("customer_kyc", "*", 500),
  ]);

  const kycMap = new Map(kycRows.map((row) => [getString(row, "user_id"), row]));
  const riders = allUsers.filter((user) => {
    const role = String(user.role ?? "").toLowerCase();
    return role === "rider" || role === "user";
  });

  return riders.map((user) => {
    const kyc = kycMap.get(user.id);
    const documents = customerKycDocumentsForAdmin(kyc as Record<string, unknown> | undefined);
    const docSet = customerKycDocumentsFromRow(kyc as Record<string, unknown> | undefined);

    const status = kyc
      ? normalizeManagementKycStatus(getString(kyc, "status", user.kyc_status))
      : normalizeManagementKycStatus(user.kyc_status);

    return {
      id: user.id,
      kycRecordId: kyc ? getString(kyc, "id") : null,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      aadhaar: docSet.aadhaar_front_url ? "Document uploaded" : "Not provided",
      status,
      documents,
    };
  });
}

function normalizeManagementKycStatus(status: string): OwnerStatus {
  const value = status.toLowerCase();
  if (value === "verified" || value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

function normalizeManagementOwnerStatus(status: string): OwnerStatus {
  const value = status.toLowerCase();
  if (value === "approved" || value === "verified") return "approved";
  if (value === "rejected") return "rejected";
  return "pending";
}

/** Merged owner list + KYC + vehicles for /admin/owner-management */
export async function getAdminOwnerManagementList(): Promise<AdminOwnerManagementRecord[]> {
  noStore();
  const owners = await getAdminOwnerList();

  const [kycRows, profileRows, vehicleRows, userStatusRows] = await Promise.all([
    getAdminOwnerKycList(),
    selectOwnerProfilesForAdmin(500),
    selectRows(
      "vehicles",
      "id, owner_id, vehicle_make, vehicle_model, vehicle_year, registration_number, approval_status",
      500
    ),
    selectRows("users", "id, owner_status, kyc_status", 500),
  ]);

  const kycMap = new Map(kycRows.map((row) => [row.id, row]));
  const profileMap = new Map(profileRows.map((row) => [getString(row, "user_id"), row]));
  const userMap = new Map(userStatusRows.map((row) => [getString(row, "id"), row]));

  const vehiclesByOwner = new Map<string, AdminOwnerManagementRecord["vehicles"]>();
  vehicleRows.forEach((row) => {
    const ownerId = getString(row, "owner_id");
    if (!ownerId) return;
    const make = getString(row, "vehicle_make");
    const model = getString(row, "vehicle_model");
    const year = getString(row, "vehicle_year");
    const name = make && model ? `${make} ${model}${year ? ` (${year})` : ""}` : "Vehicle";
    const list = vehiclesByOwner.get(ownerId) ?? [];
    list.push({
      id: getString(row, "id"),
      name,
      registration_number: getString(row, "registration_number"),
      status: getString(row, "approval_status", "pending"),
    });
    vehiclesByOwner.set(ownerId, list);
  });

  return owners.map((owner) => {
    const kyc = kycMap.get(owner.id);
    const profile = profileMap.get(owner.id);
    const user = userMap.get(owner.id);
    const kycStatus = resolveOwnerKycAdminStatus({
      profileKyc: getString(profile, "kyc_status") || undefined,
      userKyc: getString(user, "kyc_status") || undefined,
      legacyKyc: kyc?.status,
    });
    const ownerStatus = ownerStatusFromRow(profile, user);

    const profileRow = profile
      ? {
          user_id: owner.id,
          aadhaar_document_url: getString(profile, "aadhaar_document_url") || null,
          license_document_url: getString(profile, "license_document_url") || null,
          selfie_document_url: getString(profile, "selfie_document_url") || null,
          address_proof_url: getString(profile, "address_proof_url") || null,
          aadhaar_number: null,
          license_number: null,
          kyc_submitted_at: null,
        }
      : null;
    const legacyDocs = {
      aadhaar: kyc?.documents?.aadhaar,
      license: kyc?.documents?.license,
      selfie: kyc?.documents?.selfie,
      address_proof: kyc?.documents?.address_proof,
    };
    const documents = ownerProfileDocumentsToSet(profileRow, legacyDocs);

    return {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      mobile: owner.mobile,
      city: owner.city || getString(profile, "city"),
      vehicleCount: owner.vehicleCount,
      kycStatus,
      ownerStatus,
      created_at: owner.created_at,
      canApproveKyc:
        (Boolean(kyc?.canApprove) || ownerKycCanApprove(documents)) &&
        kycStatus !== "approved",
      canApproveOwner: kycStatus === "approved" && ownerStatus !== "approved",
      documents,
      aadhaar: kyc?.aadhaar ?? "Not provided",
      license: kyc?.license ?? "Not provided",
      vehicles: vehiclesByOwner.get(owner.id) ?? [],
    };
  });
}

/** Merged customer list + KYC for /admin/customer-management */
export async function getAdminCustomerManagementList(): Promise<AdminCustomerManagementRecord[]> {
  const [users, kycRows, profileRows, bookingRows] = await Promise.all([
    getAdminUserList(500),
    selectRows("customer_kyc", "*", 500),
    selectRows("customer_profiles", "user_id, kyc_status, status", 500),
    selectRows("bookings", "id, user_id", 500),
  ]);

  const kycMap = new Map(kycRows.map((row) => [getString(row, "user_id"), row]));
  const profileMap = new Map(profileRows.map((row) => [getString(row, "user_id"), row]));
  const bookingCounts = new Map<string, number>();
  bookingRows.forEach((row) => {
    const userId = getString(row, "user_id");
    if (!userId) return;
    bookingCounts.set(userId, (bookingCounts.get(userId) ?? 0) + 1);
  });

  return users
    .filter((user) => {
      const role = String(user.role ?? "").toLowerCase();
      return role === "rider" || role === "user";
    })
    .map((user) => {
      const kyc = kycMap.get(user.id);
      const profile = profileMap.get(user.id);
      const kycStatus = normalizeManagementKycStatus(
        getString(kyc, "status", getString(profile, "kyc_status", user.kyc_status))
      );
      const userStatus = normalizeManagementOwnerStatus(
        getString(profile, "status", user.is_blocked ? "rejected" : "pending")
      );
      const docSet = customerKycDocumentsFromRow(kyc as Record<string, unknown> | undefined);
      const hasDocs = customerKycHasRequiredDocs(docSet);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        kycStatus,
        userStatus: user.is_blocked ? "blocked" : userStatus,
        bookings: bookingCounts.get(user.id) ?? 0,
        created_at: user.created_at,
        canApproveKyc: hasDocs && kycStatus !== "approved",
        canApproveCustomer: kycStatus === "approved" && userStatus !== "approved",
        documents: customerKycDocumentsForAdmin(kyc as Record<string, unknown> | undefined),
        aadhaar: docSet.aadhaar_front_url ? "Document uploaded" : "Not provided",
        is_blocked: user.is_blocked,
      };
    })
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

/** Vehicle documents — from public.vehicles + vehicle_documents table. */
export async function getAdminVehicleDocumentList(limit = 200): Promise<AdminVehicleDocumentRecord[]> {
  const vehicles = await getAdminVehicleList(limit);
  if (vehicles.length === 0) return [];

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const { data: docRows, error } = await db()
    .from("vehicle_documents")
    .select("vehicle_id, document_type, document_url, verified")
    .in("vehicle_id", vehicleIds);

  const docsByVehicle = new Map<string, Record<string, string>>();
  if (!error) {
    asRows(docRows).forEach((row) => {
      const vehicleId = getString(row, "vehicle_id");
      const type = getString(row, "document_type");
      const url = getString(row, "document_url");
      if (!vehicleId || !type || !url) return;
      const bucket = docsByVehicle.get(vehicleId) ?? {};
      bucket[type] = url;
      docsByVehicle.set(vehicleId, bucket);
    });
  }

  return vehicles.map((vehicle) => {
    const extra = docsByVehicle.get(vehicle.id) ?? {};
    const meta = vehicleMap.get(vehicle.id);
    return {
      id: vehicle.id,
      vehicle_name: vehicle.vehicle_name,
      registration_number: vehicle.registration_number,
      owner_name: vehicle.owner_name,
      rc_url: vehicle.rc_document_url ?? extra.rc ?? null,
      insurance_url: vehicle.insurance_document_url ?? extra.insurance ?? null,
      pollution_url: extra.pollution ?? null,
      fitness_url: extra.fitness ?? null,
      verification_status: vehicle.documents_status ?? "pending",
      owner_kyc_approved: isOwnerKycApproved(meta?.kyc_status),
    };
  });
}

export async function getOwnerStats(ownerId: string): Promise<OwnerStats> {
  const stats = await getPlatformStats();
  const [vehicles, returnJourneys, driverVehicles, selfDriveVehicles, bookings] = await Promise.all([
    selectRows("vehicles", "id, owner_id, vehicle_make, vehicle_model, vehicle_year, registration_number, vehicle_category, approval_status, created_at", 500),
    selectRows("return_journeys", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows("driver_vehicles", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows("self_drive_vehicles", "id, owner_id, vehicle_name, vehicle_type, status, available_seats, created_at", 500),
    selectRows(
      "bookings",
      "id, owner_id, amount, booking_status, payment_status, refund_status, booking_type, created_at",
      500
    ),
  ]);

  const ownerVehicles = [...vehicles, ...returnJourneys, ...driverVehicles, ...selfDriveVehicles].filter(
    (row) => getString(row, "owner_id") === ownerId
  );
  const ownerBookings = bookings.filter((row) => getString(row, "owner_id") === ownerId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const revenueRows = ownerBookings;
  const revenue = sumBookingRevenue(revenueRows);
  const monthlyRevenue = sumBookingRevenueSince(revenueRows, monthStart);

  return {
    ...stats,
    vehicles: ownerVehicles.length,
    vehiclesTableCount: vehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    returnJourneys: returnJourneys.filter((row) => getString(row, "owner_id") === ownerId).length,
    driverVehicles: driverVehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    selfDriveVehicles: selfDriveVehicles.filter((row) => getString(row, "owner_id") === ownerId).length,
    bookings: ownerBookings.length,
    revenue,
    monthlyRevenue,
    activeVehicles: ownerVehicles.filter((row) => isPublicListing(row)).length,
    bookingRequests: ownerBookings.filter((row) => getString(row, "booking_status", "pending") === "pending").length,
    recentVehicles: vehicles
      .filter((row) => getString(row, "owner_id") === ownerId)
      .slice(0, 8)
      .map((row) => {
        const make = getString(row, "vehicle_make");
        const model = getString(row, "vehicle_model");
        const year = getString(row, "vehicle_year");
        const name =
          make && model
            ? `${make} ${model}${year ? ` (${year})` : ""}`
            : getString(row, "vehicle_name", getString(row, "registration_number", "Vehicle"));
        return {
          id: getString(row, "id"),
          vehicle_name: name,
          vehicle_type: getString(row, "vehicle_category", getString(row, "vehicle_type", "Unknown")),
          vehicle_number: getString(row, "registration_number", getString(row, "vehicle_number")),
          status: getString(row, "approval_status", getString(row, "status", "pending")),
          created_at: getString(row, "created_at"),
        };
      }),
    recentBookings: ownerBookings.slice(0, 8).map((row) => ({
      id: getString(row, "id"),
      booking_type: getString(row, "booking_type", "booking"),
      amount: getNumber(row, "amount"),
      booking_status: getString(row, "booking_status", "pending"),
      created_at: getString(row, "created_at"),
    })),
    revenueTrend: bucketTrend(revenueRows, "amount"),
    bookingTrend: bucketTrend(ownerBookings),
  };
}

export async function getOwnerDashboardMetrics(ownerId: string): Promise<OwnerDashboardMetrics> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [vehicles, bookings, earnings] = await Promise.all([
    selectRows("vehicles", "id, owner_id, approval_status", 500),
    selectRows("bookings", "id, owner_id, booking_status, pickup_date, amount, created_at", 500),
    selectRows("owner_earnings", "id, owner_id, net_amount, earned_at, created_at", 500),
  ]);

  const ownerVehicles = vehicles.filter((r) => getString(r, "owner_id") === ownerId);
  const approvedVehicles = ownerVehicles.filter(
    (r) => getString(r, "approval_status", getString(r, "vehicle_approval_status")) === "approved"
  ).length;
  const pendingVehicles = ownerVehicles.filter((r) => {
    const status = getString(r, "approval_status", getString(r, "vehicle_approval_status", "pending"));
    return status === "pending";
  }).length;
  const ownerBookings = bookings.filter((r) => getString(r, "owner_id") === ownerId);
  const ownerEarnings = earnings.filter((r) => getString(r, "owner_id") === ownerId);

  const activeBookings = ownerBookings.filter(
    (r) => ["pending", "confirmed"].includes(getString(r, "booking_status"))
  ).length;

  const upcomingTrips = ownerBookings.filter((r) => {
    const status = getString(r, "booking_status");
    const pickupDate = getString(r, "pickup_date");
    return status === "confirmed" && pickupDate && new Date(pickupDate) >= today;
  }).length;

  const earningsToday = ownerEarnings
    .filter((r) => new Date(getString(r, "earned_at", getString(r, "created_at"))) >= today)
    .reduce((sum, r) => sum + getNumber(r, "net_amount"), 0);

  const earningsThisMonth = ownerEarnings
    .filter((r) => new Date(getString(r, "earned_at", getString(r, "created_at"))) >= monthStart)
    .reduce((sum, r) => sum + getNumber(r, "net_amount"), 0);

  return {
    totalVehicles: ownerVehicles.length,
    approvedVehicles,
    pendingVehicles,
    activeBookings,
    upcomingTrips,
    earningsToday,
    earningsThisMonth,
  };
}

export async function getOwnerBookings(ownerId: string): Promise<UserBooking[]> {
  const rows = await selectBookingsWithFilter(BOOKING_OWNER_COLUMN_SETS, (columns) =>
    db()
      .from("bookings")
      .select(columns)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(200)
  );

  return rows.map((row) => ({
    id: getString(row, "id"),
    booking_reference: getString(row, "booking_reference") || undefined,
    booking_type: getString(row, "booking_type", "booking"),
    passenger_name: getString(row, "passenger_name", "Passenger"),
    amount: getNumber(row, "amount"),
    booking_status: getString(row, "booking_status", "pending"),
    payment_status: getString(row, "payment_status", "pending"),
    pickup_location: getString(row, "pickup_location") || undefined,
    drop_location: getString(row, "drop_location") || undefined,
    pickup_date: getString(row, "pickup_date") || undefined,
    created_at: getString(row, "created_at"),
    refund_status: getString(row, "refund_status") || undefined,
  }));
}

export async function getUserBookings(userId: string): Promise<UserBooking[]> {
  const records = await getMyBookingsForUser(userId);
  return records.map((row) => ({
    id: row.id,
    booking_reference: row.booking_reference,
    booking_type: row.booking_type,
    passenger_name: row.passenger_name,
    amount: row.amount,
    booking_status: row.booking_status,
    payment_status: row.payment_status,
    pickup_location: row.pickup_location,
    drop_location: row.drop_location,
    pickup_date: row.pickup_date,
    pickup_time: row.pickup_time,
    created_at: row.created_at,
  }));
}

export async function getUserBookingsExtended(userId: string): Promise<UserBookingExtended[]> {
  const rows = await selectBookingsWithRequestedColumns(
    "id, user_id, booking_reference, booking_type, passenger_name, amount, booking_status, payment_status, pickup_location, drop_location, pickup_date, pickup_time, created_at, cancelled_at, cancel_reason, special_instructions",
    100
  );
  return rows
    .filter((r) => getString(r, "user_id") === userId)
    .map((row) => ({
      id: getString(row, "id"),
      booking_reference: getString(row, "booking_reference") || undefined,
      booking_type: getString(row, "booking_type", "booking"),
      passenger_name: getString(row, "passenger_name", "Passenger"),
      amount: getNumber(row, "amount"),
      booking_status: getString(row, "booking_status", "pending"),
      payment_status: getString(row, "payment_status", "pending"),
      pickup_location: getString(row, "pickup_location") || undefined,
      drop_location: getString(row, "drop_location") || undefined,
      pickup_date: getString(row, "pickup_date") || undefined,
      pickup_time: getString(row, "pickup_time") || undefined,
      created_at: getString(row, "created_at"),
      cancelled_at: getString(row, "cancelled_at") || undefined,
      refund_amount: getNumber(row, "refund_amount") || undefined,
      refund_status: getString(row, "refund_status") || undefined,
      refund_processed_at: getString(row, "refund_processed_at") || undefined,
      cancellation_reason:
        getString(row, "cancellation_reason") || getString(row, "cancel_reason") || undefined,
      ...deriveProtectionFields(row),
    }));
}

export async function getMyBookingsForUser(userId: string): Promise<MyBookingRecord[]> {
  const { getMyBookingsForRider } = await import("@/lib/bookings/rider-bookings-query");
  return getMyBookingsForRider(userId);
}

export async function getSavedVehicles(userId: string) {
  const { data, error } = await db()
    .from("saved_vehicles")
    .select("*, vehicles(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function searchReturnJourneysWithMatch(filters: {
  fromCity?: string;
  toCity?: string;
  date?: string;
  vehicleType?: string;
}): Promise<QueryResult<SearchResult[]>> {
  const result = await searchReturnJourneys(filters);
  if (!filters.fromCity || !filters.toCity) return result;

  const matched = result.data.filter((journey) =>
    scoreRouteMatch({
      searchFrom: filters.fromCity!,
      searchTo: filters.toCity!,
      listingFrom: journey.from_city,
      listingTo: journey.to_city,
    }) >= 50
  );

  // Cache matches in route_matches table (fire-and-forget)
  const dbClient = db();
  for (const journey of matched) {
    dbClient.from("route_matches").upsert({
      return_journey_id: journey.id,
      search_from_city: filters.fromCity,
      search_to_city: filters.toCity,
      match_score: scoreRouteMatch({
        searchFrom: filters.fromCity!,
        searchTo: filters.toCity!,
        listingFrom: journey.from_city,
        listingTo: journey.to_city,
      }),
    }).then(() => {});
  }

  return { data: matched.length > 0 ? matched : result.data, error: null };
}

export async function getReturnJourneyMarketplace(filters?: {
  from?: string;
  to?: string;
  date?: string;
}) {
  return searchReturnJourneys({
    fromCity: filters?.from,
    toCity: filters?.to,
    date: filters?.date,
  });
}

export async function getOwnerEarnings(ownerId: string) {
  const { data, error } = await db()
    .from("owner_earnings")
    .select("*")
    .eq("owner_id", ownerId)
    .order("earned_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingTableError(error)) return [];
    console.error("[getOwnerEarnings]", error.message);
    return [];
  }
  return data ?? [];
}

export async function getVehicleDocumentsForAdmin(vehicleId: string) {
  const { data, error } = await db()
    .from("vehicle_documents")
    .select("*")
    .eq("vehicle_id", vehicleId);
  if (error) return [];
  return data ?? [];
}
