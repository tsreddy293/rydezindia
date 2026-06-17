"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import {
  getVehicleDocuments,
  getVehicleImages,
  saveVehicleDocument,
  saveVehicleImages,
  uploadVehicleFile,
  type VehicleDocumentType,
} from "@/lib/services/vehicle-upload";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

const VEHICLE_CATEGORIES = [
  "Hatchback",
  "Sedan",
  "SUV",
  "Luxury",
  "Van",
  "Tempo Traveller",
  "Mini Bus",
] as const;

const MOBILE_REGEX = /^[6-9]\d{9}$/;

export interface VehicleFormInput {
  vehicle_name: string;
  vehicle_number: string;
  vehicle_category: string;
  fuel_type: string;
  transmission: string;
  seating_capacity: number;
  has_ac: boolean;
}

function revalidateVehiclePaths() {
  revalidatePath("/owner/vehicles");
  revalidatePath("/owner/dashboard");
  revalidatePath("/admin/vehicles");
  revalidatePath("/search-driver");
}

async function uploadIfPresent(
  ownerId: string,
  vehicleId: string,
  formData: FormData,
  name: string,
  folder: "images" | VehicleDocumentType
) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadVehicleFile(ownerId, vehicleId, folder, file);
}

export async function getOwnerVehiclesList(ownerId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getOwnerVehicleById(vehicleId: string, ownerId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) return null;

  const [images, documents] = await Promise.all([
    getVehicleImages(vehicleId),
    getVehicleDocuments(vehicleId),
  ]);

  return { ...data, images, documents };
}

export async function createOwnerVehicle(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");
  const ownerId = user.id;

  const input: VehicleFormInput = {
    vehicle_name: String(formData.get("vehicle_name") ?? "").trim(),
    vehicle_number: String(formData.get("vehicle_number") ?? "").trim().toUpperCase(),
    vehicle_category: String(formData.get("vehicle_category") ?? ""),
    fuel_type: String(formData.get("fuel_type") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    seating_capacity: Number(formData.get("seating_capacity") ?? 0),
    has_ac: formData.get("has_ac") === "true" || formData.get("has_ac") === "on",
  };

  if (!input.vehicle_name) return { success: false, error: "Vehicle name is required" };
  if (!input.vehicle_number) return { success: false, error: "Vehicle number is required" };
  if (!VEHICLE_CATEGORIES.includes(input.vehicle_category as (typeof VEHICLE_CATEGORIES)[number])) {
    return { success: false, error: "Select a valid vehicle category" };
  }
  if (input.seating_capacity < 1) return { success: false, error: "Seating capacity must be at least 1" };

  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .insert({
      owner_id: ownerId,
      vehicle_name: input.vehicle_name,
      vehicle_number: input.vehicle_number,
      vehicle_type: input.vehicle_category,
      fuel_type: input.fuel_type || null,
      transmission: input.transmission || null,
      seats: input.seating_capacity,
      has_ac: input.has_ac,
      status: "pending",
      vehicle_approval_status: "pending",
      photos: [],
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  const vehicleId = data.id as string;

  try {
    const imageUrls: string[] = [];
    for (const key of formData.getAll("vehicle_images")) {
      if (key instanceof File && key.size > 0) {
        imageUrls.push(await uploadVehicleFile(ownerId, vehicleId, "images", key));
      }
    }

    const rcUrl = await uploadIfPresent(ownerId, vehicleId, formData, "rc", "rc");
    const insuranceUrl = await uploadIfPresent(ownerId, vehicleId, formData, "insurance", "insurance");
    const pollutionUrl = await uploadIfPresent(ownerId, vehicleId, formData, "pollution", "pollution");
    const fitnessUrl = await uploadIfPresent(ownerId, vehicleId, formData, "fitness", "fitness");

    if (imageUrls.length > 0) {
      await saveVehicleImages(vehicleId, imageUrls);
      await db.from("vehicles").update({ photos: imageUrls }).eq("id", vehicleId);
    }
    if (rcUrl) await saveVehicleDocument(vehicleId, "rc", rcUrl);
    if (insuranceUrl) await saveVehicleDocument(vehicleId, "insurance", insuranceUrl);
    if (pollutionUrl) await saveVehicleDocument(vehicleId, "pollution", pollutionUrl);
    if (fitnessUrl) await saveVehicleDocument(vehicleId, "fitness", fitnessUrl);
  } catch (uploadError) {
    return {
      success: false,
      error: uploadError instanceof Error ? uploadError.message : "File upload failed",
    };
  }

  revalidateVehiclePaths();
  return { success: true, data: { id: vehicleId } };
}

export async function updateOwnerVehicle(
  vehicleId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");
  const ownerId = user.id;

  const existing = await getOwnerVehicleById(vehicleId, ownerId);
  if (!existing) return { success: false, error: "Vehicle not found" };

  const input: VehicleFormInput = {
    vehicle_name: String(formData.get("vehicle_name") ?? "").trim(),
    vehicle_number: String(formData.get("vehicle_number") ?? "").trim().toUpperCase(),
    vehicle_category: String(formData.get("vehicle_category") ?? ""),
    fuel_type: String(formData.get("fuel_type") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    seating_capacity: Number(formData.get("seating_capacity") ?? 0),
    has_ac: formData.get("has_ac") === "true" || formData.get("has_ac") === "on",
  };

  if (!input.vehicle_name) return { success: false, error: "Vehicle name is required" };

  const db = createAdminClient();
  const { error } = await db
    .from("vehicles")
    .update({
      vehicle_name: input.vehicle_name,
      vehicle_number: input.vehicle_number,
      vehicle_type: input.vehicle_category,
      fuel_type: input.fuel_type || null,
      transmission: input.transmission || null,
      seats: input.seating_capacity,
      has_ac: input.has_ac,
      vehicle_approval_status: "pending",
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId)
    .eq("owner_id", ownerId);

  if (error) return { success: false, error: error.message };

  try {
    const imageUrls = [...(existing.images ?? [])];
    for (const key of formData.getAll("vehicle_images")) {
      if (key instanceof File && key.size > 0) {
        imageUrls.push(await uploadVehicleFile(ownerId, vehicleId, "images", key));
      }
    }

    const rcUrl = await uploadIfPresent(ownerId, vehicleId, formData, "rc", "rc");
    const insuranceUrl = await uploadIfPresent(ownerId, vehicleId, formData, "insurance", "insurance");
    const pollutionUrl = await uploadIfPresent(ownerId, vehicleId, formData, "pollution", "pollution");
    const fitnessUrl = await uploadIfPresent(ownerId, vehicleId, formData, "fitness", "fitness");

    if (imageUrls.length > 0) {
      await saveVehicleImages(vehicleId, imageUrls);
      await db.from("vehicles").update({ photos: imageUrls }).eq("id", vehicleId);
    }
    if (rcUrl) await saveVehicleDocument(vehicleId, "rc", rcUrl);
    if (insuranceUrl) await saveVehicleDocument(vehicleId, "insurance", insuranceUrl);
    if (pollutionUrl) await saveVehicleDocument(vehicleId, "pollution", pollutionUrl);
    if (fitnessUrl) await saveVehicleDocument(vehicleId, "fitness", fitnessUrl);
  } catch (uploadError) {
    return {
      success: false,
      error: uploadError instanceof Error ? uploadError.message : "File upload failed",
    };
  }

  revalidateVehiclePaths();
  return { success: true, data: { id: vehicleId } };
}

export async function deleteOwnerVehicle(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const db = createAdminClient();

  const { error } = await db
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("owner_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidateVehiclePaths();
  return { success: true };
}

export async function createReturnJourneyListing(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");
  const db = createAdminClient();

  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const fromCity = String(formData.get("from_city") ?? "").trim();
  const toCity = String(formData.get("to_city") ?? "").trim();
  const returnFrom = String(formData.get("return_from_city") ?? toCity).trim();
  const returnTo = String(formData.get("return_to_city") ?? fromCity).trim();
  const journeyDate = String(formData.get("journey_date") ?? "");
  const journeyTime = String(formData.get("journey_time") ?? "");
  const returnTime = String(formData.get("return_departure_time") ?? "");
  const availableSeats = Number(formData.get("available_seats") ?? 1);
  const price = Number(formData.get("price") ?? 0);
  const discountPercent = Number(formData.get("discount_percent") ?? 30);
  const driverName = String(formData.get("driver_name") ?? "").trim();
  const driverPhone = String(formData.get("driver_phone") ?? "").replace(/\s/g, "");

  if (!vehicleId) return { success: false, error: "Select a vehicle" };
  if (!fromCity || !toCity) return { success: false, error: "Route is required" };
  if (availableSeats < 1) return { success: false, error: "At least 1 seat required" };
  if (driverPhone && !MOBILE_REGEX.test(driverPhone)) {
    return { success: false, error: "Enter a valid driver phone number" };
  }

  const { data: vehicle } = await db
    .from("vehicles")
    .select("vehicle_name, vehicle_type")
    .eq("id", vehicleId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vehicle) return { success: false, error: "Vehicle not found" };

  const payload: Record<string, unknown> = {
    owner_id: user.id,
    vehicle_id: vehicleId,
    vehicle_name: (vehicle as { vehicle_name: string }).vehicle_name,
    vehicle_type: (vehicle as { vehicle_type: string }).vehicle_type,
    from_city: fromCity,
    to_city: toCity,
    pickup_city: fromCity,
    drop_city: toCity,
    return_from_city: returnFrom,
    return_to_city: returnTo,
    journey_date: journeyDate || null,
    journey_time: journeyTime || null,
    return_departure_time: returnTime || null,
    available_seats: availableSeats,
    price,
    price_per_seat: price,
    discount_percent: Math.min(40, Math.max(20, discountPercent)),
    driver_name: driverName || null,
    driver_phone: driverPhone || null,
    status: "available",
    vehicle_approval_status: "pending",
  };

  const { data, error } = await db.from("return_journeys").insert(payload).select("id").single();
  if (error) return { success: false, error: error.message };

  revalidatePath("/return-journeys");
  revalidatePath("/search-return");
  revalidatePath("/owner/dashboard");
  return { success: true, data: { id: data.id as string } };
}
