"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

export async function saveVehicle(input: {
  vehicleId: string;
  listingType?: string;
  listingId?: string;
}): Promise<ActionResult> {
  const { user } = await requireRole("user");
  const db = createAdminClient();

  const { error } = await db.from("saved_vehicles").upsert(
    {
      user_id: user.id,
      vehicle_id: input.vehicleId,
      listing_type: input.listingType ?? "with_driver",
      listing_id: input.listingId ?? null,
    },
    { onConflict: "user_id,vehicle_id,listing_type" }
  );

  if (error?.message?.includes("does not exist")) {
    return { success: false, error: "Saved vehicles feature requires migration 007" };
  }
  if (error) return { success: false, error: error.message };

  revalidatePath("/user/dashboard");
  return { success: true };
}

export async function unsaveVehicle(vehicleId: string, listingType = "with_driver"): Promise<ActionResult> {
  const { user } = await requireRole("user");
  const db = createAdminClient();

  const { error } = await db
    .from("saved_vehicles")
    .delete()
    .eq("user_id", user.id)
    .eq("vehicle_id", vehicleId)
    .eq("listing_type", listingType);

  if (error) return { success: false, error: error.message };
  revalidatePath("/user/dashboard");
  return { success: true };
}

export async function updateCustomerProfile(formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("user");
  const db = createAdminClient();

  const payload = {
    user_id: user.id,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    preferred_vehicle_type: String(formData.get("preferred_vehicle_type") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("customer_profiles").upsert(payload, { onConflict: "user_id" });
  if (error?.message?.includes("does not exist")) {
    return { success: false, error: "Profile feature requires migration 007" };
  }
  if (error) return { success: false, error: error.message };

  revalidatePath("/user/dashboard");
  return { success: true };
}

export async function updateOwnerProfile(formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("owner");
  const db = createAdminClient();

  const payload = {
    user_id: user.id,
    business_name: String(formData.get("business_name") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    pan_number: String(formData.get("pan_number") ?? "").trim() || null,
    gst_number: String(formData.get("gst_number") ?? "").trim() || null,
    bank_account: String(formData.get("bank_account") ?? "").trim() || null,
    ifsc_code: String(formData.get("ifsc_code") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("owner_profiles").upsert(payload, { onConflict: "user_id" });
  if (error?.message?.includes("does not exist")) {
    return { success: false, error: "Profile feature requires migration 007" };
  }
  if (error) return { success: false, error: error.message };

  revalidatePath("/owner/profile");
  return { success: true };
}
