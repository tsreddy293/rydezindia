"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { createNotification } from "@/lib/services/notifications";
import { logApproval } from "@/lib/services/verification";
import {
  publishVehicleToMarketplace,
  unpublishVehicleFromMarketplace,
  validateVehicleForSubmission,
} from "@/lib/services/vehicle-onboarding";
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
  rate_per_km: number;
  base_location: string;
}

function revalidateVehiclePaths() {
  revalidatePath("/owner/vehicles");
  revalidatePath("/owner/my-vehicles");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/add-vehicle");
  revalidatePath("/admin/vehicles");
  revalidatePath("/search-driver");
}

function parseVehicleInput(formData: FormData): VehicleFormInput {
  return {
    vehicle_name: String(formData.get("vehicle_name") ?? "").trim(),
    vehicle_number: String(formData.get("vehicle_number") ?? "").trim().toUpperCase(),
    vehicle_category: String(formData.get("vehicle_category") ?? ""),
    fuel_type: String(formData.get("fuel_type") ?? ""),
    transmission: String(formData.get("transmission") ?? ""),
    seating_capacity: Number(formData.get("seating_capacity") ?? 0),
    has_ac: formData.get("has_ac") === "true" || formData.get("has_ac") === "on",
    rate_per_km: Number(formData.get("rate_per_km") ?? 0),
    base_location: String(formData.get("base_location") ?? "").trim(),
  };
}

function validateDraftInput(input: VehicleFormInput): string | null {
  if (!input.vehicle_name) return "Vehicle name is required";
  if (!input.vehicle_number) return "Vehicle number is required";
  return null;
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

async function processUploads(
  ownerId: string,
  vehicleId: string,
  formData: FormData,
  existingImages: string[] = []
) {
  const db = createAdminClient();
  const imageUrls = [...existingImages];

  for (const key of formData.getAll("vehicle_images")) {
    if (key instanceof File && key.size > 0) {
      imageUrls.push(await uploadVehicleFile(ownerId, vehicleId, "images", key));
    }
  }

  const docUploads: { field: VehicleDocumentType; expiryField: string }[] = [
    { field: "rc", expiryField: "rc_expiry" },
    { field: "insurance", expiryField: "insurance_expiry" },
    { field: "pollution", expiryField: "pollution_expiry" },
    { field: "fitness", expiryField: "fitness_expiry" },
  ];

  for (const { field, expiryField } of docUploads) {
    const url = await uploadIfPresent(ownerId, vehicleId, formData, field, field);
    const expiry = String(formData.get(expiryField) ?? "").trim() || null;
    if (url) await saveVehicleDocument(vehicleId, field, url, expiry);
    else if (expiry) {
      const docs = await getVehicleDocuments(vehicleId);
      if (docs[field]) await saveVehicleDocument(vehicleId, field, docs[field]!, expiry);
    }
  }

  if (imageUrls.length > 0) {
    await saveVehicleImages(vehicleId, imageUrls);
    await db.from("vehicles").update({ photos: imageUrls }).eq("id", vehicleId);
  }
}

async function upsertVehicleRecord(
  ownerId: string,
  input: VehicleFormInput,
  vehicleId: string | null,
  approvalStatus: "draft" | "pending"
) {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_name: input.vehicle_name,
    vehicle_number: input.vehicle_number,
    vehicle_type: input.vehicle_category,
    fuel_type: input.fuel_type || null,
    transmission: input.transmission || null,
    seats: input.seating_capacity || null,
    has_ac: input.has_ac,
    rate_per_km: input.rate_per_km || null,
    base_location: input.base_location || null,
    vehicle_approval_status: approvalStatus,
    status: approvalStatus === "pending" ? "pending" : "draft",
    reupload_requested: false,
    reupload_reason: null,
    updated_at: new Date().toISOString(),
  };

  if (approvalStatus === "pending") {
    payload.submitted_at = new Date().toISOString();
  }

  if (vehicleId) {
    const { error } = await db.from("vehicles").update(payload).eq("id", vehicleId).eq("owner_id", ownerId);
    if (error) throw new Error(error.message);
    return vehicleId;
  }

  const { data, error } = await db
    .from("vehicles")
    .insert({ ...payload, photos: [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
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

export async function saveOwnerVehicle(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");
  const action = String(formData.get("form_action") ?? "submit");
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim() || null;
  const input = parseVehicleInput(formData);

  const draftError = validateDraftInput(input);
  if (draftError) return { success: false, error: draftError };

  if (input.vehicle_category && !VEHICLE_CATEGORIES.includes(input.vehicle_category as (typeof VEHICLE_CATEGORIES)[number])) {
    if (action === "submit") return { success: false, error: "Select a valid vehicle category" };
  }

  if (vehicleId) {
    const existing = await getOwnerVehicleById(vehicleId, user.id);
    if (!existing) return { success: false, error: "Vehicle not found" };
    const approval = String((existing as Record<string, unknown>).vehicle_approval_status ?? "");
    if (approval === "approved" && action === "draft") {
      return { success: false, error: "Approved vehicles cannot be saved as draft" };
    }
  }

  try {
    const id = await upsertVehicleRecord(
      user.id,
      input,
      vehicleId,
      action === "draft" ? "draft" : "pending"
    );

    await processUploads(user.id, id, formData, vehicleId ? (await getOwnerVehicleById(id, user.id))?.images ?? [] : []);

    if (action === "submit") {
      const validation = await validateVehicleForSubmission(id);
      if (!validation.valid) {
        await createAdminClient()
          .from("vehicles")
          .update({ vehicle_approval_status: "draft", status: "draft" })
          .eq("id", id);
        return { success: false, error: validation.errors.join(". ") };
      }

      await createNotification({
        recipientRole: "admin",
        type: "vehicle_pending_approval",
        title: "New vehicle submitted",
        message: `${input.vehicle_name} (${input.vehicle_number}) is awaiting approval.`,
        metadata: { vehicleId: id, ownerId: user.id },
      });
    }

    revalidateVehiclePaths();
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save vehicle" };
  }
}

/** @deprecated Use saveOwnerVehicle */
export async function createOwnerVehicle(formData: FormData) {
  formData.set("form_action", "submit");
  return saveOwnerVehicle(formData);
}

/** @deprecated Use saveOwnerVehicle */
export async function updateOwnerVehicle(vehicleId: string, formData: FormData) {
  formData.set("vehicle_id", vehicleId);
  return saveOwnerVehicle(formData);
}

export async function submitOwnerVehicleForApproval(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const existing = await getOwnerVehicleById(vehicleId, user.id);
  if (!existing) return { success: false, error: "Vehicle not found" };

  const validation = await validateVehicleForSubmission(vehicleId);
  if (!validation.valid) return { success: false, error: validation.errors.join(". ") };

  const db = createAdminClient();
  await db
    .from("vehicles")
    .update({
      vehicle_approval_status: "pending",
      status: "pending",
      submitted_at: new Date().toISOString(),
      reupload_requested: false,
      reupload_reason: null,
    })
    .eq("id", vehicleId);

  await createNotification({
    recipientRole: "admin",
    type: "vehicle_pending_approval",
    title: "Vehicle resubmitted",
    message: `Vehicle ${String((existing as Record<string, unknown>).vehicle_name)} is awaiting review.`,
    metadata: { vehicleId, ownerId: user.id },
  });

  revalidateVehiclePaths();
  return { success: true };
}

export async function deleteOwnerVehicle(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const db = createAdminClient();
  const { error } = await db.from("vehicles").delete().eq("id", vehicleId).eq("owner_id", user.id);
  if (error) return { success: false, error: error.message };
  await unpublishVehicleFromMarketplace(vehicleId);
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
    .select("vehicle_name, vehicle_type, vehicle_approval_status")
    .eq("id", vehicleId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!vehicle) return { success: false, error: "Vehicle not found" };
  if ((vehicle as { vehicle_approval_status?: string }).vehicle_approval_status !== "approved") {
    return { success: false, error: "Only approved vehicles can list return journeys" };
  }

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

export async function approveOwnerVehicle(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const validation = await validateVehicleForSubmission(vehicleId);
  if (!validation.valid) {
    return { success: false, error: `Cannot approve: ${validation.errors.join(", ")}` };
  }

  const { error } = await db
    .from("vehicles")
    .update({
      vehicle_approval_status: "approved",
      status: "available",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
      reupload_requested: false,
      reupload_reason: null,
    })
    .eq("id", vehicleId);

  if (error) return { success: false, error: error.message };

  await publishVehicleToMarketplace(vehicleId);

  const { data: vehicle } = await db.from("vehicles").select("owner_id, vehicle_name").eq("id", vehicleId).maybeSingle();
  const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;

  if (ownerId) {
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_approved",
      title: "Vehicle approved",
      message: `Your vehicle "${(vehicle as { vehicle_name?: string }).vehicle_name}" is now live and searchable.`,
      metadata: { vehicleId },
    });
  }

  await logApproval({
    entityType: "vehicle",
    entityId: vehicleId,
    action: "approved",
    approvedBy: user.id,
  });

  revalidateVehiclePaths();
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectOwnerVehicle(vehicleId: string, reason: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: vehicle } = await db.from("vehicles").select("owner_id, vehicle_name").eq("id", vehicleId).maybeSingle();

  const { error } = await db
    .from("vehicles")
    .update({
      vehicle_approval_status: "rejected",
      status: "unavailable",
      rejection_reason: reason || "Rejected by admin",
      reupload_requested: false,
    })
    .eq("id", vehicleId);

  if (error) return { success: false, error: error.message };

  await unpublishVehicleFromMarketplace(vehicleId);

  const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;
  if (ownerId) {
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_rejected",
      title: "Vehicle rejected",
      message: reason || "Your vehicle listing was rejected.",
      metadata: { vehicleId },
    });
  }

  await logApproval({
    entityType: "vehicle",
    entityId: vehicleId,
    action: "rejected",
    approvedBy: user.id,
    remarks: reason,
  });

  revalidateVehiclePaths();
  revalidatePath("/admin");
  return { success: true };
}

export async function requestVehicleReupload(vehicleId: string, reason: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: vehicle } = await db.from("vehicles").select("owner_id, vehicle_name").eq("id", vehicleId).maybeSingle();

  const { error } = await db
    .from("vehicles")
    .update({
      vehicle_approval_status: "draft",
      status: "draft",
      reupload_requested: true,
      reupload_reason: reason || "Please re-upload your documents",
      rejection_reason: reason || null,
    })
    .eq("id", vehicleId);

  if (error) return { success: false, error: error.message };

  await unpublishVehicleFromMarketplace(vehicleId);

  const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;
  if (ownerId) {
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_reupload_requested",
      title: "Re-upload required",
      message: reason || "Please update your vehicle photos or documents.",
      metadata: { vehicleId },
    });
  }

  await logApproval({
    entityType: "vehicle",
    entityId: vehicleId,
    action: "reupload_requested",
    approvedBy: user.id,
    remarks: reason,
  });

  revalidateVehiclePaths();
  revalidatePath("/admin/vehicles");
  return { success: true };
}
