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
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

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
  if (input.mobile.trim() && !MOBILE_REGEX.test(input.mobile.replace(/\s/g, ""))) {
    return "Enter a valid 10-digit Indian mobile number";
  }
  if (!EMAIL_REGEX.test(input.email)) return "Enter a valid email address";
  if (!input.city.trim()) return "City is required";
  if (!input.address.trim()) return "Address is required";
  if (!input.password || input.password.length < 8) return "Password must be at least 8 characters";
  if (!AADHAAR_REGEX.test(input.aadhaar_number.replace(/\s/g, ""))) {
    return "Aadhaar number must be 12 digits";
  }
  const pan = input.pan_number.trim().toUpperCase();
  if (!PAN_REGEX.test(pan)) return "Enter a valid PAN number (e.g. ABCDE1234F)";
  if (!input.license_number.trim()) return "Driving licence number is required";
  if (!input.bank_account.trim()) return "Bank account number is required";
  if (!input.bank_name.trim()) return "Bank name is required";
  const ifsc = input.ifsc_code.trim().toUpperCase();
  if (!IFSC_REGEX.test(ifsc)) return "Enter a valid IFSC code";
  return null;
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://rydezindia.com").replace(/\/$/, "");
}

/** Register owner — creates auth user, profile, and KYC/bank details (no vehicle). */
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
  const pan = input.pan_number.trim().toUpperCase();
  const ifsc = input.ifsc_code.trim().toUpperCase();
  const email = input.email.toLowerCase().trim();
  const password = input.password!;

  try {
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: input.name.trim(),
        mobile: mobile || null,
        city: input.city.trim(),
        role: "owner",
      },
    });

    if (authError) {
      console.error("[registerOwner] Auth error:", authError.message);
      return { success: false, error: authError.message };
    }

    const ownerUserId = authData.user.id;

    const profilePayload = {
      id: ownerUserId,
      name: input.name.trim(),
      full_name: input.name.trim(),
      email,
      mobile: mobile || "",
      city: input.city.trim(),
      role: "owner",
      owner_status: "pending",
    } as Record<string, unknown>;
    const profileResult = await db.from("users").upsert(profilePayload).select("id");
    if (profileResult.error?.message?.includes("column")) {
      delete profilePayload.full_name;
      delete profilePayload.owner_status;
      await db.from("users").upsert(profilePayload).select("id");
    }

    const ownerProfilePayload = {
      user_id: ownerUserId,
      address: input.address.trim(),
      city: input.city.trim(),
      pan_number: pan,
      bank_account: input.bank_account.trim(),
      ifsc_code: ifsc,
      bank_name: input.bank_name.trim(),
      aadhaar_number: aadhaar,
      license_number: input.license_number.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    };

    const profileInsert = await db.from("owner_profiles").upsert(ownerProfilePayload, { onConflict: "user_id" });
    if (profileInsert.error && !profileInsert.error.message?.includes("column")) {
      console.warn("[registerOwner] owner_profiles upsert:", profileInsert.error.message);
    } else if (profileInsert.error?.message?.includes("column")) {
      const { bank_name, aadhaar_number, license_number, ...fallbackProfile } = ownerProfilePayload;
      await db.from("owner_profiles").upsert(fallbackProfile, { onConflict: "user_id" });
    }

    const ownerRow = {
      owner_id: ownerUserId,
      name: input.name.trim(),
      mobile: mobile || "",
      email,
      city: input.city.trim(),
      aadhaar_number: aadhaar,
      license_number: input.license_number.trim().toUpperCase(),
      status: "pending" as const,
    };

    const insertResult = await db.from("vehicle_owners").insert(ownerRow).select("id").single();

    if (insertResult.error && isMissingTableError(insertResult.error)) {
      console.warn("[registerOwner] vehicle_owners table missing, skipping legacy row");
    } else if (insertResult.error && !insertResult.error.message?.includes("column")) {
      console.warn("[registerOwner] vehicle_owners insert:", insertResult.error.message);
    }

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/owner/dashboard");

    return { success: true, data: { id: ownerUserId } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    console.error("[registerOwner] Exception:", message);
    return { success: false, error: message };
  }
}

/** Register owner, sign in, and redirect to dashboard. */
export async function registerOwnerAndRedirect(input: RegisterOwnerInput): Promise<void> {
  const result = await registerOwner(input);
  if (!result.success) {
    throw new Error(result.error ?? "Registration failed");
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email.toLowerCase().trim(),
    password: input.password!,
  });

  if (signInError) {
    redirect(`/login/owner?success=${encodeURIComponent("Account created. Please sign in to continue.")}`);
  }

  redirect("/owner/dashboard");
}
