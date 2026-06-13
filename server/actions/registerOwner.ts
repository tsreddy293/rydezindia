"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { ActionResult, RegisterOwnerInput } from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAAR_REGEX = /^\d{12}$/;

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes("could not find the table") ||
    error.message?.toLowerCase().includes("does not exist")
  );
}

function validateOwnerInput(input: RegisterOwnerInput): string | null {
  if (!input.name.trim()) return "Full name is required";
  if (!MOBILE_REGEX.test(input.mobile.replace(/\s/g, ""))) {
    return "Enter a valid 10-digit Indian mobile number";
  }
  if (!EMAIL_REGEX.test(input.email)) return "Enter a valid email address";
  if (!input.city.trim()) return "City is required";
  if (input.password && input.password.length < 8) return "Password must be at least 8 characters";
  if (!AADHAAR_REGEX.test(input.aadhaar_number.replace(/\s/g, ""))) {
    return "Aadhaar number must be 12 digits";
  }
  if (!input.license_number.trim()) return "Driving license number is required";
  if (!input.vehicle_type) return "Vehicle type is required";
  if (!input.vehicle_number.trim()) return "Vehicle number is required";
  return null;
}

/** Register owner — creates auth user + vehicle_owners record */
export async function registerOwner(
  input: RegisterOwnerInput
): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[registerOwner] Config error:", configError);
    return { success: false, error: configError };
  }

  const validationError = validateOwnerInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const db = createAdminClient();
  const mobile = input.mobile.replace(/\s/g, "");
  const aadhaar = input.aadhaar_number.replace(/\s/g, "");
  const email = input.email.toLowerCase().trim();

  try {
    // Step 1: Create Supabase Auth user (required — users.id FK + owner_id NOT NULL)
    const tempPassword = input.password || `${crypto.randomUUID()}Aa1!`;

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: input.name.trim(),
        mobile,
        city: input.city.trim(),
        role: "owner",
      },
    });

    if (authError) {
      console.error("[registerOwner] Auth error:", authError.message);
      return { success: false, error: authError.message };
    }

    const ownerUserId = authData.user.id;

    // Step 2: Ensure users profile is updated (trigger may have created it)
    const profilePayload = {
      id: ownerUserId,
      name: input.name.trim(),
      full_name: input.name.trim(),
      email,
      mobile,
      city: input.city.trim(),
      role: "owner",
    } as Record<string, unknown>;
    const profileResult = await db.from("users").upsert(profilePayload).select("id");
    if (profileResult.error?.message?.includes("column")) {
      delete profilePayload.full_name;
      await db.from("users").upsert(profilePayload).select("id");
    }

    // Step 3: Insert vehicle_owners — try extended columns, fallback to base schema
    const extendedRow = {
      owner_id: ownerUserId,
      name: input.name.trim(),
      mobile,
      email,
      city: input.city.trim(),
      aadhaar_number: aadhaar,
      license_number: input.license_number.trim().toUpperCase(),
      vehicle_type: input.vehicle_type,
      vehicle_number: input.vehicle_number.trim().toUpperCase(),
      status: "pending" as const,
    };

    const baseRow = {
      owner_id: ownerUserId,
      vehicle_number: input.vehicle_number.trim().toUpperCase(),
      vehicle_type: input.vehicle_type,
      vehicle_model: input.vehicle_type,
      seating_capacity: 5,
      status: "pending" as const,
    };

    let insertResult = await db
      .from("vehicle_owners")
      .insert(extendedRow)
      .select("id")
      .single();

    if (insertResult.error?.message?.includes("column")) {
      console.warn("[registerOwner] Extended columns missing, using base schema");
      insertResult = await db
        .from("vehicle_owners")
        .insert(baseRow)
        .select("id")
        .single();
    }

    if (insertResult.error && isMissingTableError(insertResult.error)) {
      const ownerInsert = await db
        .from("owners")
        .insert({
          owner_name: input.name.trim(),
          mobile,
          email,
          address: input.city.trim(),
          verification_status: "pending",
        })
        .select("id")
        .single();

      if (ownerInsert.error) {
        console.error("[registerOwner] Owners insert error:", ownerInsert.error.message);
        await db.auth.admin.deleteUser(ownerUserId);
        return { success: false, error: ownerInsert.error.message };
      }

      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath("/vehicles/add");
      revalidatePath("/vehicles/self-drive");
      revalidatePath("/vehicles/driver");
      const supabase = await createClient();
      await supabase.auth.signInWithPassword({ email, password: tempPassword });

      return { success: true, data: { id: ownerInsert.data.id as string } };
    }

    if (insertResult.error) {
      console.error("[registerOwner] Insert error:", insertResult.error.message);
      await db.auth.admin.deleteUser(ownerUserId);
      return { success: false, error: insertResult.error.message };
    }

    console.log("[registerOwner] Success — id:", insertResult.data.id);

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/vehicles/add");
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password: tempPassword });

    return { success: true, data: { id: insertResult.data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    console.error("[registerOwner] Exception:", message);
    return { success: false, error: message };
  }
}

/** Register owner and redirect to success page */
export async function registerOwnerAndRedirect(input: RegisterOwnerInput): Promise<void> {
  const result = await registerOwner(input);
  if (!result.success) {
    throw new Error(result.error ?? "Registration failed");
  }
  redirect("/owner/success");
}
