"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { ActionResult, RegisterVehicleInput } from "@/types/database";

function revalidateDashboards() {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/vehicles/add");
}

/** Register vehicle — inserts into vehicles table (if exists) AND return_journeys */
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

  const { data: ownerRow, error: ownerError } = await db
    .from("vehicle_owners")
    .select("owner_id")
    .eq("id", input.owner_id)
    .single();

  if (ownerError || !ownerRow) {
    return { success: false, error: "Owner not found" };
  }

  const ownerUserId = ownerRow.owner_id as string;
  let vehicleRecordId: string | undefined;

  // Insert into vehicles table when it exists
  const vehicleInsert = await db
    .from("vehicles")
    .insert({
      owner_id: input.owner_id,
      vehicle_type: input.vehicle_type,
      vehicle_number: input.vehicle_number.trim().toUpperCase(),
      seats: input.seats,
      from_city: input.from_city.trim(),
      to_city: input.to_city.trim(),
      price: input.price,
    })
    .select("id")
    .single();

  if (!vehicleInsert.error) {
    vehicleRecordId = vehicleInsert.data.id as string;
    console.log("[registerVehicle] vehicles table insert:", vehicleRecordId);
  } else if (!vehicleInsert.error.message.includes("Could not find the table")) {
    console.error("[registerVehicle] vehicles error:", vehicleInsert.error.message);
    return { success: false, error: vehicleInsert.error.message };
  } else {
    console.log("[registerVehicle] vehicles table not found — skipping");
  }

  // Always create return_journey (powers search page + journey count)
  const journeyInsert = await db
    .from("return_journeys")
    .insert({
      owner_id: ownerUserId,
      vehicle_id: input.owner_id,
      from_city: input.from_city.trim(),
      to_city: input.to_city.trim(),
      journey_date: new Date().toISOString().split("T")[0],
      available_seats: input.seats,
      price_per_seat: input.price,
      status: "available",
    })
    .select("id")
    .single();

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
