"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { ActionResult, RegisterVehicleInput } from "@/types/database";

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

function revalidateDashboards() {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/search-return");
  revalidatePath("/admin");
  revalidatePath("/vehicles/add");
}

/** Register a return journey vehicle and listing */
export async function registerVehicle(
  input: RegisterVehicleInput
): Promise<ActionResult<{ id: string; journeyId?: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    return { success: false, error: configError };
  }

  if (!input.owner_id) return { success: false, error: "Owner is required" };
  if (!input.vehicle_number.trim()) return { success: false, error: "Vehicle number is required" };
  if (!input.vehicle_type) return { success: false, error: "Vehicle type is required" };
  if (input.seats < 1) return { success: false, error: "Seats must be at least 1" };
  if (!input.from_city.trim()) return { success: false, error: "From city is required" };
  if (!input.to_city.trim()) return { success: false, error: "To city is required" };
  if (input.price < 0) return { success: false, error: "Price must be positive" };

  const db = createAdminClient();

  const { data: legacyOwnerRow, error: legacyOwnerError } = await db
    .from("vehicle_owners")
    .select("owner_id")
    .eq("id", input.owner_id)
    .maybeSingle();

  let ownerUserId = (legacyOwnerRow as { owner_id?: string } | null)?.owner_id ?? input.owner_id;

  if ((legacyOwnerError && !isMissingTableError(legacyOwnerError)) || (!legacyOwnerRow && !isMissingTableError(legacyOwnerError))) {
    const { data: ownerRow, error: ownerError } = await db
      .from("owners")
      .select("id")
      .eq("id", input.owner_id)
      .maybeSingle();

    if (ownerError || !ownerRow) {
      return { success: false, error: "Owner not found" };
    }
    ownerUserId = String(ownerRow.id);
  } else if (legacyOwnerError && isMissingTableError(legacyOwnerError)) {
    const { data: ownerRow, error: ownerError } = await db
      .from("owners")
      .select("id")
      .eq("id", input.owner_id)
      .maybeSingle();

    if (ownerError || !ownerRow) {
      return { success: false, error: "Owner not found" };
    }
    ownerUserId = String(ownerRow.id);
  }

  if (!ownerUserId) {
    return { success: false, error: "Owner not found" };
  }

  let vehicleRecordId: string | undefined;

  // Insert into the master vehicles registry when it exists.
  const vehiclePayload = {
    owner_id: input.owner_id,
    vehicle_name: input.vehicle_name?.trim() || input.vehicle_number.trim().toUpperCase(),
    vehicle_type: input.vehicle_type,
    vehicle_number: input.vehicle_number.trim().toUpperCase(),
    fuel_type: input.fuel_type || null,
    transmission: input.transmission || null,
    seats: input.seats,
    status: "available",
    // Compatibility columns from the earlier return-journey-only table.
    from_city: input.from_city.trim(),
    to_city: input.to_city.trim(),
    price: input.price,
  } as Record<string, unknown>;

  let vehicleInsert = await db
    .from("vehicles")
    .insert(vehiclePayload)
    .select("id")
    .single();

  if (vehicleInsert.error?.message?.includes("column")) {
    delete vehiclePayload.from_city;
    delete vehiclePayload.to_city;
    delete vehiclePayload.price;
    vehicleInsert = await db
      .from("vehicles")
      .insert(vehiclePayload)
      .select("id")
      .single();
  }

  if (!vehicleInsert.error) {
    vehicleRecordId = vehicleInsert.data.id as string;
    console.log("[registerVehicle] vehicles table insert:", vehicleRecordId);
  } else if (!isMissingTableError(vehicleInsert.error)) {
    console.error("[registerVehicle] vehicles error:", vehicleInsert.error.message);
    return { success: false, error: vehicleInsert.error.message };
  } else {
    console.log("[registerVehicle] vehicles table not found — skipping");
  }

  // Always create return_journey (existing production booking/search flow).
  const journeyPayload = {
    owner_id: ownerUserId,
    vehicle_id: vehicleRecordId ?? input.owner_id,
    vehicle_name: input.vehicle_name?.trim() || input.vehicle_number.trim().toUpperCase(),
    vehicle_type: input.vehicle_type,
    pickup_city: input.from_city.trim(),
    drop_city: input.to_city.trim(),
    from_city: input.from_city.trim(),
    to_city: input.to_city.trim(),
    journey_date: input.journey_date || new Date().toISOString().split("T")[0],
    journey_time: input.journey_time || null,
    available_seats: input.seats,
    price: input.price,
    price_per_seat: input.price,
    status: "available",
  } as Record<string, unknown>;

  let journeyInsert = await db
    .from("return_journeys")
    .insert(journeyPayload)
    .select("id")
    .single();

  if (journeyInsert.error?.message?.includes("column")) {
    delete journeyPayload.vehicle_name;
    delete journeyPayload.vehicle_type;
    delete journeyPayload.pickup_city;
    delete journeyPayload.drop_city;
    delete journeyPayload.journey_time;
    delete journeyPayload.price;
    journeyInsert = await db
      .from("return_journeys")
      .insert(journeyPayload)
      .select("id")
      .single();
  }

  if (journeyInsert.error) {
    console.error("[registerVehicle] return_journeys error:", journeyInsert.error.message);
    return { success: false, error: journeyInsert.error.message };
  }

  const journeyId = journeyInsert.data.id as string;
  console.log("[registerVehicle] return_journeys insert:", journeyId);

  revalidateDashboards();

  return {
    success: true,
    data: { id: vehicleRecordId ?? journeyId, journeyId },
  };
}
