import { createAdminClient } from "@/lib/supabase/admin";
import { getVehicleDocuments, getVehicleImages } from "@/lib/services/vehicle-upload";

export type VehicleOnboardingStatus = "draft" | "pending" | "approved" | "rejected";

export function normalizeOnboardingStatus(value: unknown): VehicleOnboardingStatus {
  const s = String(value ?? "draft");
  if (s === "approved" || s === "rejected" || s === "pending" || s === "draft") return s;
  if (s === "available") return "approved";
  return "pending";
}

export function onboardingStatusLabel(status: VehicleOnboardingStatus): string {
  const labels: Record<VehicleOnboardingStatus, string> = {
    draft: "Draft",
    pending: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status];
}

export function onboardingStatusClasses(status: VehicleOnboardingStatus): string {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "rejected") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-700";
}

const REQUIRED_DOCS = ["rc", "insurance", "pollution"] as const;

export async function validateVehicleForSubmission(vehicleId: string) {
  const db = createAdminClient();
  const { data: vehicle, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !vehicle) return { valid: false, errors: ["Vehicle not found"] };

  const v = vehicle as Record<string, unknown>;
  const errors: string[] = [];

  if (!String(v.vehicle_name ?? "").trim()) errors.push("Vehicle name is required");
  if (!String(v.vehicle_number ?? "").trim()) errors.push("Vehicle number is required");
  if (!String(v.vehicle_type ?? "").trim()) errors.push("Category is required");
  if (!String(v.fuel_type ?? "").trim()) errors.push("Fuel type is required");
  if (!String(v.transmission ?? "").trim()) errors.push("Transmission is required");
  if (Number(v.seats ?? 0) < 1) errors.push("Seating capacity is required");
  if (!Number(v.rate_per_km) || Number(v.rate_per_km) <= 0) errors.push("Price per KM is required");

  const images = await getVehicleImages(vehicleId);
  if (images.length === 0) errors.push("At least one vehicle photo is required");

  const documents = await getVehicleDocuments(vehicleId);
  for (const doc of REQUIRED_DOCS) {
    if (!documents[doc]) errors.push(`${doc.toUpperCase()} document is required`);
  }

  return { valid: errors.length === 0, errors };
}

/** Publish approved vehicle to driver_vehicles marketplace listing. */
export async function publishVehicleToMarketplace(vehicleId: string) {
  const db = createAdminClient();
  const { data: vehicle, error } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (error || !vehicle) throw new Error("Vehicle not found");

  const v = vehicle as Record<string, unknown>;
  const ownerId = String(v.owner_id);
  const ratePerKm = Number(v.rate_per_km) || 15;
  const baseLocation = String(v.base_location ?? "India");

  const { data: owner } = await db
    .from("users")
    .select("name, full_name, mobile")
    .eq("id", ownerId)
    .maybeSingle();

  const ownerRow = owner as { name?: string; full_name?: string; mobile?: string } | null;
  const driverName = ownerRow?.full_name || ownerRow?.name || "Owner Driver";
  const driverPhone = ownerRow?.mobile || "9999999999";

  const { data: existing } = await db
    .from("driver_vehicles")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  const listingPayload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_id: vehicleId,
    vehicle_name: v.vehicle_name,
    vehicle_type: v.vehicle_type,
    driver_name: driverName,
    driver_phone: driverPhone,
    rate_per_km: ratePerKm,
    price: ratePerKm,
    base_location: baseLocation,
    pickup_city: baseLocation,
    available_seats: Number(v.seats) || 4,
    status: "available",
    vehicle_approval_status: "approved",
    availability: "available",
  };

  if (existing) {
    await db.from("driver_vehicles").update(listingPayload).eq("id", (existing as { id: string }).id);
  } else {
    await db.from("driver_vehicles").insert(listingPayload);
  }

  await db
    .from("vehicle_documents")
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq("vehicle_id", vehicleId)
    .in("document_type", ["rc", "insurance", "pollution"]);
}

export async function unpublishVehicleFromMarketplace(vehicleId: string) {
  const db = createAdminClient();
  await db
    .from("driver_vehicles")
    .update({ status: "unavailable", vehicle_approval_status: "rejected", availability: "unavailable" })
    .eq("vehicle_id", vehicleId);
}
