"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOwnerApprovedForVehicle } from "@/lib/supabase/queries";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { createNotification } from "@/lib/services/notifications";
import { logApproval } from "@/lib/services/verification";
import {
  publishVehicleToMarketplace,
  unpublishVehicleFromMarketplace,
  validateVehicleForSubmission,
} from "@/lib/services/vehicle-onboarding";
import { uploadVehicleFile } from "@/lib/services/vehicle-upload";
import {
  mapVehicleRow,
  vehicleDisplayName,
  type OwnerVehicleRow,
} from "@/lib/vehicles/format";
import {
  DEFAULT_VEHICLE_SERVICES,
  parseServiceAvailability,
  serviceAvailabilityPayload,
  type VehicleServiceAvailability,
} from "@/lib/vehicles/services";
import {
  DEFAULT_VEHICLE_TRIP_TYPES,
  parseTripTypesFromFormData,
  tripTypesPayload,
  type VehicleTripTypeAvailability,
} from "@/lib/vehicles/trip-types";
import { assertOwnerCanCreateVehicle } from "@/server/actions/ownerKyc";
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
  vehicle_make: string;
  vehicle_model: string;
  registration_number: string;
  vehicle_year: number;
  vehicle_category: string;
}

function revalidateVehiclePaths() {
  revalidatePath("/owner/vehicles");
  revalidatePath("/owner/my-vehicles");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/add-vehicle");
  revalidatePath("/admin/vehicles");
  revalidatePath("/search-driver");
  revalidatePath("/search-self-drive");
  revalidatePath("/search-local");
  revalidatePath("/search-return");
}

function parseVehicleInput(formData: FormData): VehicleFormInput {
  const yearRaw = String(formData.get("vehicle_year") ?? "").trim();
  return {
    vehicle_make: String(formData.get("vehicle_make") ?? "").trim(),
    vehicle_model: String(formData.get("vehicle_model") ?? "").trim(),
    registration_number: String(
      formData.get("registration_number") ?? formData.get("vehicle_number") ?? ""
    )
      .trim()
      .toUpperCase(),
    vehicle_year: Number(yearRaw),
    vehicle_category: String(formData.get("vehicle_category") ?? "").trim(),
  };
}

function validateFormInput(input: VehicleFormInput): string | null {
  if (!input.vehicle_make) return "Vehicle make is required";
  if (!input.vehicle_model) return "Vehicle model is required";
  if (!input.registration_number) return "Registration number is required";
  if (!input.vehicle_year || input.vehicle_year < 1990) return "Valid vehicle year is required";
  if (!input.vehicle_category) return "Vehicle category is required";
  return null;
}

async function uploadIfPresent(
  ownerId: string,
  vehicleId: string,
  formData: FormData,
  field: string,
  folder: "images" | "rc" | "insurance"
): Promise<string | undefined> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadVehicleFile(ownerId, vehicleId, folder === "images" ? "images" : folder, file);
}

async function processUploads(
  ownerId: string,
  vehicleId: string,
  formData: FormData,
  existing?: OwnerVehicleRow
) {
  const db = createAdminClient();
  const updates: Record<string, string> = {};

  const photoUrl = await uploadIfPresent(ownerId, vehicleId, formData, "vehicle_photo", "images");
  if (photoUrl) updates.vehicle_photo_url = photoUrl;

  const firstImage = formData.get("vehicle_images");
  if (!photoUrl && firstImage instanceof File && firstImage.size > 0) {
    updates.vehicle_photo_url = await uploadVehicleFile(ownerId, vehicleId, "images", firstImage);
  }

  const rcUrl = await uploadIfPresent(ownerId, vehicleId, formData, "rc", "rc");
  if (rcUrl) updates.rc_document_url = rcUrl;

  const insuranceUrl = await uploadIfPresent(ownerId, vehicleId, formData, "insurance", "insurance");
  if (insuranceUrl) updates.insurance_document_url = insuranceUrl;

  if (Object.keys(updates).length === 0) return;

  const { error } = await db.from("vehicles").update(updates).eq("id", vehicleId).eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
}

async function upsertVehicleRecord(
  ownerId: string,
  input: VehicleFormInput,
  vehicleId: string | null,
  services: VehicleServiceAvailability = DEFAULT_VEHICLE_SERVICES,
  tripTypes: VehicleTripTypeAvailability = DEFAULT_VEHICLE_TRIP_TYPES
): Promise<string> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    owner_id: ownerId,
    vehicle_make: input.vehicle_make,
    vehicle_model: input.vehicle_model,
    registration_number: input.registration_number,
    vehicle_year: input.vehicle_year,
    vehicle_category: input.vehicle_category,
    approval_status: "pending",
    documents_status: "pending",
    updated_at: new Date().toISOString(),
    ...serviceAvailabilityPayload(services),
    ...tripTypesPayload(tripTypes),
  };

  function stripAvailabilityColumns(target: Record<string, unknown>) {
    delete target.service_self_drive;
    delete target.service_with_driver;
    delete target.service_local_rental;
    delete target.service_return_journey;
    delete target.trip_one_way;
    delete target.trip_round_trip;
    delete target.trip_multi_city;
    delete target.trip_airport_transfer;
    delete target.trip_local_rental;
  }

  if (vehicleId) {
    let { error } = await db.from("vehicles").update(payload).eq("id", vehicleId).eq("owner_id", ownerId);
    if (error?.message?.includes("service_") || error?.message?.includes("trip_")) {
      const fallback = { ...payload };
      stripAvailabilityColumns(fallback);
      ({ error } = await db.from("vehicles").update(fallback).eq("id", vehicleId).eq("owner_id", ownerId));
    }
    if (error) throw new Error(error.message);
    return vehicleId;
  }

  let { data, error } = await db.from("vehicles").insert(payload).select("id").single();
  if (error?.message?.includes("documents_status")) {
    delete payload.documents_status;
    ({ data, error } = await db.from("vehicles").insert(payload).select("id").single());
  }
  if (error?.message?.includes("service_") || error?.message?.includes("trip_")) {
    const fallback = { ...payload };
    stripAvailabilityColumns(fallback);
    ({ data, error } = await db.from("vehicles").insert(fallback).select("id").single());
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create vehicle");
  return data.id as string;
}

function validateAvailabilitySelection(
  services: VehicleServiceAvailability,
  tripTypes: VehicleTripTypeAvailability
): string | null {
  if (!Object.values(services).some(Boolean)) {
    return "Select at least one service type";
  }
  if (!Object.values(tripTypes).some(Boolean)) {
    return "Select at least one trip type";
  }
  return null;
}

async function persistVehicleAvailability(
  ownerId: string,
  vehicleId: string,
  services: VehicleServiceAvailability,
  tripTypes: VehicleTripTypeAvailability
): Promise<void> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    ...serviceAvailabilityPayload(services),
    ...tripTypesPayload(tripTypes),
    updated_at: new Date().toISOString(),
  };

  let { error } = await db
    .from("vehicles")
    .update(payload)
    .eq("id", vehicleId)
    .eq("owner_id", ownerId);

  if (error?.message?.includes("service_") || error?.message?.includes("trip_")) {
    const fallback = { ...payload };
    delete fallback.service_self_drive;
    delete fallback.service_with_driver;
    delete fallback.service_local_rental;
    delete fallback.service_return_journey;
    delete fallback.trip_one_way;
    delete fallback.trip_round_trip;
    delete fallback.trip_multi_city;
    delete fallback.trip_airport_transfer;
    delete fallback.trip_local_rental;
    ({ error } = await db
      .from("vehicles")
      .update(fallback)
      .eq("id", vehicleId)
      .eq("owner_id", ownerId));
  }

  if (error) throw new Error(error.message);
}

export async function updateOwnerVehicleAvailability(
  formData: FormData
): Promise<ActionResult> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim();
  if (!vehicleId) return { success: false, error: "Vehicle ID required" };

  const existing = await getOwnerVehicleById(vehicleId, user.id);
  if (!existing) return { success: false, error: "Vehicle not found" };

  const services = parseServiceAvailability(formData);
  const tripTypes = parseTripTypesFromFormData(formData);
  const availabilityError = validateAvailabilitySelection(services, tripTypes);
  if (availabilityError) return { success: false, error: availabilityError };

  try {
    await persistVehicleAvailability(user.id, vehicleId, services, tripTypes);
    revalidateVehiclePaths();
    return {
      success: true,
      message: "Service and trip types updated successfully.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update availability";
    return { success: false, error: message };
  }
}

export async function getOwnerVehiclesList(ownerId: string): Promise<OwnerVehicleRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getOwnerVehiclesList]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapVehicleRow(row as Record<string, unknown>));
}

export async function getOwnerVehicleById(
  vehicleId: string,
  ownerId: string
): Promise<OwnerVehicleRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) return null;
  return mapVehicleRow(data as Record<string, unknown>);
}

export async function saveOwnerVehicle(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  const { user } = await requireRole("owner");

  const createCheck = await assertOwnerCanCreateVehicle();
  if (!createCheck.ok) return { success: false, error: createCheck.error };

  const vehicleId = String(formData.get("vehicle_id") ?? "").trim() || null;
  const input = parseVehicleInput(formData);
  const services = parseServiceAvailability(formData);
  const tripTypes = parseTripTypesFromFormData(formData);

  const validationError = validateFormInput(input);
  if (validationError) return { success: false, error: validationError };

  const availabilityError = validateAvailabilitySelection(services, tripTypes);
  if (availabilityError) return { success: false, error: availabilityError };

  if (
    input.vehicle_category &&
    !VEHICLE_CATEGORIES.includes(input.vehicle_category as (typeof VEHICLE_CATEGORIES)[number])
  ) {
    return { success: false, error: "Select a valid vehicle category" };
  }

  let existing: OwnerVehicleRow | null = null;
  if (vehicleId) {
    existing = await getOwnerVehicleById(vehicleId, user.id);
    if (!existing) return { success: false, error: "Vehicle not found" };
    if (existing.approval_status === "approved") {
      return { success: false, error: "Approved vehicles cannot be edited. Contact support." };
    }
  }

  try {
    const id = await upsertVehicleRecord(user.id, input, vehicleId, services, tripTypes);
    await processUploads(user.id, id, formData, existing ?? undefined);

    const submissionCheck = await validateVehicleForSubmission(id);
    if (!submissionCheck.valid) {
      return { success: false, error: submissionCheck.errors.join(". ") };
    }

    let { error: submitError } = await createAdminClient()
      .from("vehicles")
      .update({
        approval_status: "pending",
        documents_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (submitError?.message?.includes("documents_status")) {
      ({ error: submitError } = await createAdminClient()
        .from("vehicles")
        .update({ approval_status: "pending", updated_at: new Date().toISOString() })
        .eq("id", id));
    }

    if (submitError) throw new Error(submitError.message);

    await createNotification({
      recipientRole: "admin",
      type: "vehicle_pending_approval",
      title: "New vehicle submitted",
      message: `${vehicleDisplayName(input)} (${input.registration_number}) is awaiting approval.`,
      metadata: { vehicleId: id, ownerId: user.id },
    });

    revalidateVehiclePaths();
    return {
      success: true,
      data: { id },
      message: "Vehicle submitted successfully. Waiting for admin approval.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save vehicle";
    if (message.includes("Could not find the table") || message.includes("does not exist")) {
      return {
        success: false,
        error: "Vehicles table not found. Run migration 012_vehicles_table_integration.sql in Supabase.",
      };
    }
    return { success: false, error: message };
  }
}

export async function submitOwnerVehicleForApproval(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("owner");

  const createCheck = await assertOwnerCanCreateVehicle();
  if (!createCheck.ok) return { success: false, error: createCheck.error };

  const existing = await getOwnerVehicleById(vehicleId, user.id);
  if (!existing) return { success: false, error: "Vehicle not found" };

  const validation = await validateVehicleForSubmission(vehicleId);
  if (!validation.valid) return { success: false, error: validation.errors.join(". ") };

  const db = createAdminClient();
  let { error } = await db
    .from("vehicles")
    .update({
      approval_status: "pending",
      documents_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error?.message?.includes("documents_status")) {
    ({ error } = await db
      .from("vehicles")
      .update({ approval_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", vehicleId));
  }

  if (error) return { success: false, error: error.message };

  await createNotification({
    recipientRole: "admin",
    type: "vehicle_pending_approval",
    title: "Vehicle resubmitted",
    message: `${vehicleDisplayName(existing)} is awaiting review.`,
    metadata: { vehicleId, ownerId: user.id },
  });

  revalidateVehiclePaths();
  return {
    success: true,
    message: "Vehicle submitted successfully. Waiting for admin approval.",
  };
}

export async function deleteOwnerVehicle(vehicleId: string): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const existing = await getOwnerVehicleById(vehicleId, user.id);
  if (!existing) return { success: false, error: "Vehicle not found" };
  if (existing.approval_status === "approved") {
    return { success: false, error: "Approved vehicles cannot be deleted. Contact support." };
  }

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

  const vehicle = await getOwnerVehicleById(vehicleId, user.id);
  if (!vehicle) return { success: false, error: "Vehicle not found" };
  if (vehicle.approval_status !== "approved") {
    return { success: false, error: "Only approved vehicles can list return journeys" };
  }
  if (!vehicle.service_return_journey) {
    return { success: false, error: "Return Journey is not enabled for this vehicle. Update service availability first." };
  }

  const payload: Record<string, unknown> = {
    owner_id: user.id,
    vehicle_id: vehicleId,
    vehicle_name: vehicleDisplayName(vehicle),
    vehicle_type: vehicle.vehicle_category,
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

  const { data: vehicleRow, error: fetchError } = await db
    .from("vehicles")
    .select("owner_id")
    .eq("id", vehicleId)
    .maybeSingle();

  if (fetchError) return { success: false, error: fetchError.message };
  if (!vehicleRow) return { success: false, error: "Vehicle not found" };

  const ownerId = String((vehicleRow as { owner_id: string }).owner_id);
  const ownerCheck = await assertOwnerApprovedForVehicle(ownerId);
  if (!ownerCheck.ok) {
    return { success: false, error: ownerCheck.error };
  }

  const validation = await validateVehicleForSubmission(vehicleId);
  if (!validation.valid) {
    return { success: false, error: `Cannot approve: ${validation.errors.join(", ")}` };
  }

  const approvedPayload: Record<string, unknown> = {
    approval_status: "approved",
    documents_status: "approved",
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  let { error } = await db.from("vehicles").update(approvedPayload).eq("id", vehicleId);

  if (error?.message?.includes("documents_status")) {
    delete approvedPayload.documents_status;
    ({ error } = await db.from("vehicles").update(approvedPayload).eq("id", vehicleId));
  }

  if (error?.message?.includes("is_active")) {
    delete approvedPayload.is_active;
    ({ error } = await db.from("vehicles").update(approvedPayload).eq("id", vehicleId));
  }

  if (error) return { success: false, error: error.message };

  await publishVehicleToMarketplace(vehicleId);

  const { data: vehicle } = await db
    .from("vehicles")
    .select("owner_id, vehicle_make, vehicle_model, vehicle_year")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicle) {
    const v = mapVehicleRow(vehicle as Record<string, unknown>);
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_approved",
      title: "Vehicle approved",
      message: `Your vehicle "${vehicleDisplayName(v)}" is now live and searchable.`,
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
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { success: true };
}

export async function rejectOwnerVehicle(vehicleId: string, reason: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: vehicle } = await db
    .from("vehicles")
    .select("owner_id, vehicle_make, vehicle_model, vehicle_year")
    .eq("id", vehicleId)
    .maybeSingle();

  const { error } = await db
    .from("vehicles")
    .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", vehicleId);

  if (error) return { success: false, error: error.message };

  await unpublishVehicleFromMarketplace(vehicleId);

  const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;
  if (ownerId && vehicle) {
    const v = mapVehicleRow(vehicle as Record<string, unknown>);
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_rejected",
      title: "Vehicle rejected",
      message: reason || `Your vehicle "${vehicleDisplayName(v)}" was rejected.`,
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
  revalidatePath("/admin/vehicles");
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { success: true };
}

export async function requestVehicleReupload(vehicleId: string, reason: string): Promise<ActionResult> {
  const { user } = await requireRole("admin");
  const db = createAdminClient();

  const { data: vehicle } = await db
    .from("vehicles")
    .select("owner_id, vehicle_make, vehicle_model, vehicle_year")
    .eq("id", vehicleId)
    .maybeSingle();

  const { error } = await db
    .from("vehicles")
    .update({ approval_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", vehicleId);

  if (error) return { success: false, error: error.message };

  await unpublishVehicleFromMarketplace(vehicleId);

  const ownerId = (vehicle as { owner_id?: string } | null)?.owner_id;
  if (ownerId && vehicle) {
    const v = mapVehicleRow(vehicle as Record<string, unknown>);
    await createNotification({
      recipientId: ownerId,
      recipientRole: "owner",
      type: "vehicle_reupload_requested",
      title: "Re-upload required",
      message: reason || `Please update documents for "${vehicleDisplayName(v)}".`,
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

export async function updateVehicleServiceAvailability(
  vehicleId: string,
  services: VehicleServiceAvailability
): Promise<ActionResult> {
  await requireRole("admin");
  const db = createAdminClient();

  let { error } = await db
    .from("vehicles")
    .update({
      ...serviceAvailabilityPayload(services),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error?.message?.includes("service_")) {
    return {
      success: false,
      error: "Service columns missing. Run supabase/RUN_VEHICLE_SERVICE_AVAILABILITY.sql in Supabase.",
    };
  }
  if (error) return { success: false, error: error.message };

  const { data: vehicle } = await db.from("vehicles").select("*").eq("id", vehicleId).maybeSingle();
  if (vehicle && mapVehicleRow(vehicle as Record<string, unknown>).approval_status === "approved") {
    await publishVehicleToMarketplace(vehicleId);
  }

  revalidateVehiclePaths();
  revalidatePath("/admin/vehicles");
  return { success: true };
}
