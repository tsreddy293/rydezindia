import { createAdminClient } from "@/lib/supabase/admin";
import { mapVehicleRow, vehicleDisplayName } from "@/lib/vehicles/format";

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

/** Publish approved vehicle to driver_vehicles marketplace listing. */
export async function publishVehicleToMarketplace(vehicleId: string) {
  const db = createAdminClient();
  const { data: vehicle, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !vehicle) throw new Error("Vehicle not found");

  const v = mapVehicleRow(vehicle as Record<string, unknown>);
  const ownerId = v.owner_id;
  const ratePerKm = 15;
  const baseLocation = "India";

  const { data: owner } = await db
    .from("users")
    .select("name, full_name, mobile, city")
    .eq("id", ownerId)
    .maybeSingle();

  const ownerRow = owner as { name?: string; full_name?: string; mobile?: string; city?: string } | null;
  const driverName = ownerRow?.full_name || ownerRow?.name || "Owner Driver";
  const driverPhone = ownerRow?.mobile || "9999999999";
  const city = ownerRow?.city || baseLocation;
  const displayName = vehicleDisplayName(v);

  const { data: existing } = await db
    .from("driver_vehicles")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const listingPayload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_id: vehicleId,
    vehicle_name: displayName,
    vehicle_type: v.vehicle_category,
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

  if (existing) {
    await db.from("driver_vehicles").update(listingPayload).eq("id", (existing as { id: string }).id);
  } else {
    await db.from("driver_vehicles").insert(listingPayload);
  }
}

export async function unpublishVehicleFromMarketplace(vehicleId: string) {
  const db = createAdminClient();
  await db
    .from("driver_vehicles")
    .update({ status: "unavailable", vehicle_approval_status: "rejected", availability: "unavailable" })
    .eq("vehicle_id", vehicleId);
}
