"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type {
  ActionResult,
  RegisterDriverVehicleInput,
  RegisterSelfDriveInput,
} from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

function revalidateMarketplace() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/owner/dashboard");
  revalidatePath("/search-self-drive");
  revalidatePath("/search-driver");
}

function sanitizePhotos(photos?: string[]) {
  return (photos ?? [])
    .map((photo) => photo.trim())
    .filter((photo) => photo.length > 0);
}

async function createMasterVehicle(input: {
  owner_id: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_number: string;
  fuel_type?: string;
  transmission?: string;
  seats: number;
  photos?: string[];
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("vehicles")
    .insert({
      owner_id: input.owner_id,
      vehicle_name: input.vehicle_name.trim(),
      vehicle_type: input.vehicle_type,
      vehicle_number: input.vehicle_number.trim().toUpperCase(),
      fuel_type: input.fuel_type || null,
      transmission: input.transmission || null,
      seats: input.seats,
      photos: sanitizePhotos(input.photos),
      status: "available",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function registerSelfDriveVehicle(
  input: RegisterSelfDriveInput
): Promise<ActionResult<{ id: string; vehicleId: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  if (!input.owner_id) return { success: false, error: "Owner is required" };
  if (!input.vehicle_name.trim()) return { success: false, error: "Vehicle name is required" };
  if (!input.vehicle_number.trim()) return { success: false, error: "Vehicle number is required" };
  if (!input.vehicle_type) return { success: false, error: "Vehicle type is required" };
  if (input.seats < 1) return { success: false, error: "Seats must be at least 1" };
  if (!input.location.trim()) return { success: false, error: "Location is required" };
  if (input.daily_rent < 0) return { success: false, error: "Daily rent must be positive" };
  if (input.security_deposit < 0) return { success: false, error: "Security deposit must be positive" };

  const db = createAdminClient();

  try {
    const vehicleId =
      input.vehicle_id ||
      (await createMasterVehicle({
        owner_id: input.owner_id,
        vehicle_name: input.vehicle_name,
        vehicle_type: input.vehicle_type,
        vehicle_number: input.vehicle_number,
        fuel_type: input.fuel_type,
        transmission: input.transmission,
        seats: input.seats,
        photos: input.photos,
      }));

    const { data, error } = await db
      .from("self_drive_vehicles")
      .insert({
        owner_id: input.owner_id,
        vehicle_id: vehicleId,
        vehicle_name: input.vehicle_name.trim(),
        vehicle_type: input.vehicle_type,
        pickup_city: input.pickup_city?.trim() || input.location.trim(),
        drop_city: input.drop_city?.trim() || "",
        journey_date: input.journey_date || null,
        journey_time: input.journey_time || null,
        available_seats: input.available_seats ?? input.seats,
        price: input.price ?? input.daily_rent,
        status: "available",
        location: input.location.trim(),
        daily_rent: input.daily_rent,
        security_deposit: input.security_deposit,
        availability: "available",
        photos: sanitizePhotos(input.photos),
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidateMarketplace();
    return { success: true, data: { id: data.id as string, vehicleId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register self-drive vehicle",
    };
  }
}

export async function registerDriverVehicle(
  input: RegisterDriverVehicleInput
): Promise<ActionResult<{ id: string; vehicleId: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };

  if (!input.owner_id) return { success: false, error: "Owner is required" };
  if (!input.vehicle_name.trim()) return { success: false, error: "Vehicle name is required" };
  if (!input.vehicle_number.trim()) return { success: false, error: "Vehicle number is required" };
  if (!input.vehicle_type) return { success: false, error: "Vehicle type is required" };
  if (input.seats < 1) return { success: false, error: "Seats must be at least 1" };
  if (!input.driver_name.trim()) return { success: false, error: "Driver name is required" };
  if (!MOBILE_REGEX.test(input.driver_phone.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid driver phone number" };
  }
  if (!input.base_location.trim()) return { success: false, error: "Base location is required" };
  if (input.rate_per_km < 0) return { success: false, error: "Rate per km must be positive" };

  const db = createAdminClient();

  try {
    const vehicleId =
      input.vehicle_id ||
      (await createMasterVehicle({
        owner_id: input.owner_id,
        vehicle_name: input.vehicle_name,
        vehicle_type: input.vehicle_type,
        vehicle_number: input.vehicle_number,
        fuel_type: input.fuel_type,
        transmission: input.transmission,
        seats: input.seats,
      }));

    const { data, error } = await db
      .from("driver_vehicles")
      .insert({
        owner_id: input.owner_id,
        vehicle_id: vehicleId,
        vehicle_name: input.vehicle_name.trim(),
        vehicle_type: input.vehicle_type,
        pickup_city: input.pickup_city?.trim() || input.base_location.trim(),
        drop_city: input.drop_city?.trim() || "",
        journey_date: input.journey_date || null,
        journey_time: input.journey_time || null,
        available_seats: input.available_seats ?? input.seats,
        price: input.price ?? input.rate_per_km,
        status: "available",
        driver_name: input.driver_name.trim(),
        driver_phone: input.driver_phone.replace(/\s/g, ""),
        rate_per_km: input.rate_per_km,
        base_location: input.base_location.trim(),
        availability: "available",
        local_package_price: input.local_package_price ?? 0,
        outstation_package_price: input.outstation_package_price ?? 0,
        airport_transfer_price: input.airport_transfer_price ?? 0,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidateMarketplace();
    return { success: true, data: { id: data.id as string, vehicleId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register driver vehicle",
    };
  }
}
