import { createAdminClient } from "@/lib/supabase/admin";
import { mapVehicleRow, vehicleDisplayName } from "@/lib/vehicles/format";
import {
  normalizeVehicleCategory,
  resolveDailyFare,
  resolveSecurityDeposit,
  resolveVehicleCity,
} from "@/lib/vehicles/search";

export type VehicleOnboardingStatus = "pending" | "approved" | "rejected";

export function normalizeOnboardingStatus(value: unknown): VehicleOnboardingStatus {
  const s = String(value ?? "pending").toLowerCase();
  if (s === "approved" || s === "rejected") return s;
  return "pending";
}

export function onboardingStatusLabel(status: VehicleOnboardingStatus): string {
  const labels: Record<VehicleOnboardingStatus, string> = {
    pending: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status];
}

export function onboardingStatusClasses(status: VehicleOnboardingStatus): string {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export async function validateVehicleForSubmission(vehicleId: string) {
  const db = createAdminClient();
  const { data: vehicle, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !vehicle) return { valid: false, errors: ["Vehicle not found"] };

  const v = mapVehicleRow(vehicle as Record<string, unknown>);
  const errors: string[] = [];

  if (!v.vehicle_make.trim()) errors.push("Vehicle make is required");
  if (!v.vehicle_model.trim()) errors.push("Vehicle model is required");
  if (!v.registration_number.trim()) errors.push("Registration number is required");
  if (!v.vehicle_category.trim()) errors.push("Vehicle category is required");
  if (!v.vehicle_year || v.vehicle_year < 1990) errors.push("Vehicle year is required");
  if (!v.vehicle_photo_url) errors.push("Vehicle photo is required");
  if (!v.rc_document_url) errors.push("RC document is required");
  if (!v.insurance_document_url) errors.push("Insurance document is required");

  return { valid: errors.length === 0, errors };
}

/** Publish approved vehicle to marketplace listings (driver + self-drive). */
export async function publishVehicleToMarketplace(vehicleId: string) {
  const db = createAdminClient();
  const { data: vehicle, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !vehicle) throw new Error("Vehicle not found");

  const v = mapVehicleRow(vehicle as Record<string, unknown>);
  const ownerId = v.owner_id;
  const ratePerKm = 15;
  const category = normalizeVehicleCategory(v.vehicle_category);
  const dailyRent = resolveDailyFare(vehicle as Record<string, unknown>, category);
  const securityDeposit = resolveSecurityDeposit(vehicle as Record<string, unknown>, category);

  const { data: owner } = await db
    .from("users")
    .select("name, mobile, city")
    .eq("id", ownerId)
    .maybeSingle();

  let ownerCity = "";
  const ownerRow = owner as { name?: string; full_name?: string; mobile?: string; city?: string } | null;
  if (ownerRow?.city) {
    ownerCity = ownerRow.city;
  } else {
    const { data: profile } = await db
      .from("owner_profiles")
      .select("city")
      .eq("user_id", ownerId)
      .maybeSingle();
    ownerCity = (profile as { city?: string } | null)?.city ?? "";
    if (!ownerCity) {
      try {
        const { data: authUser } = await db.auth.admin.getUserById(ownerId);
        ownerCity = String(authUser.user?.user_metadata?.city ?? "");
      } catch {
        ownerCity = "";
      }
    }
  }

  const driverName = ownerRow?.name || ownerRow?.full_name || "Owner Driver";
  const driverPhone = ownerRow?.mobile || "9999999999";
  const city = resolveVehicleCity(vehicle as Record<string, unknown>, ownerCity || "India");
  const displayName = vehicleDisplayName(v);
  const photos = v.vehicle_photo_url ? [v.vehicle_photo_url] : [];

  const { data: existingDriver } = await db
    .from("driver_vehicles")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const driverListingPayload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_id: vehicleId,
    vehicle_name: displayName,
    vehicle_type: category,
    driver_name: driverName,
    driver_phone: driverPhone,
    rate_per_km: ratePerKm,
    price: ratePerKm,
    base_location: city,
    pickup_city: city,
    available_seats: 4,
    status: "available",
    vehicle_approval_status: "approved",
    availability: "available",
  };

  if (existingDriver) {
    const { error } = await db
      .from("driver_vehicles")
      .update(driverListingPayload)
      .eq("id", (existingDriver as { id: string }).id);
    if (error) console.warn("[publishVehicleToMarketplace] driver update:", error.message);
  } else {
    const { error } = await db.from("driver_vehicles").insert(driverListingPayload);
    if (error) console.warn("[publishVehicleToMarketplace] driver insert:", error.message);
  }

  const { data: existingSelfDrive } = await db
    .from("self_drive_vehicles")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const selfDrivePayload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_id: vehicleId,
    vehicle_name: displayName,
    vehicle_type: category,
    pickup_city: city,
    location: city,
    price: dailyRent,
    daily_rent: dailyRent,
    security_deposit: securityDeposit,
    available_seats: 4,
    status: "available",
    vehicle_approval_status: "approved",
    availability: "available",
    photos,
  };

  if (existingSelfDrive) {
    const { error } = await db
      .from("self_drive_vehicles")
      .update(selfDrivePayload)
      .eq("id", (existingSelfDrive as { id: string }).id);
    if (error) console.warn("[publishVehicleToMarketplace] self-drive update:", error.message);
  } else {
    const { error } = await db.from("self_drive_vehicles").insert(selfDrivePayload);
    if (error) console.warn("[publishVehicleToMarketplace] self-drive insert:", error.message);
  }
}

export async function unpublishVehicleFromMarketplace(vehicleId: string) {
  const db = createAdminClient();
  await db
    .from("driver_vehicles")
    .update({ status: "unavailable", vehicle_approval_status: "rejected", availability: "unavailable" })
    .eq("vehicle_id", vehicleId);
  await db
    .from("self_drive_vehicles")
    .update({ status: "unavailable", vehicle_approval_status: "rejected", availability: "unavailable" })
    .eq("vehicle_id", vehicleId);
  await db
    .from("vehicles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", vehicleId);
}
