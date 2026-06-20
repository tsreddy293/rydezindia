"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";
import { usersWritePayload } from "@/lib/supabase/users-table";
import {
  normalizeRole,
  ROLE_LOGIN_PATHS,
  ROLE_REDIRECTS,
} from "@/lib/auth/roles";
import type { ActionResult, UserRole } from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type SignupInput = {
  name: string;
  email: string;
  mobile?: string;
  city: string;
  password: string;
};

type ProfileStepResult = { ok: true } | { ok: false; step: string; error: string };

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://rydezindia.com").replace(/\/$/, "");
}

function validatePassword(password: string) {
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, and a number";
  }
  return null;
}

function logDbResult(label: string, result: { data?: unknown; error?: { message?: string; code?: string } | null }) {
  console.log(`[signup] ${label}`, {
    data: result.data ?? null,
    error: result.error?.message ?? null,
    code: result.error?.code ?? null,
  });
}

async function upsertPublicUsersRow(
  db: SupabaseClient,
  userId: string,
  input: SignupInput,
  role: UserRole
): Promise<ProfileStepResult> {
  const mobile = input.mobile?.replace(/\s/g, "") ?? "";
  const email = input.email.toLowerCase().trim();

  const basePayload: Record<string, unknown> = {
    id: userId,
    name: input.name.trim(),
    email,
    mobile: mobile || null,
    city: input.city.trim(),
    role,
  };

  let payload: Record<string, unknown> = { ...basePayload, full_name: input.name.trim() };
  console.log("[upsertUserProfile] public.users upsert", { userId, role, payload });

  let result = await db.from("users").upsert(usersWritePayload(payload), { onConflict: "id" }).select("id").single();
  logDbResult("public.users upsert", result);

  if (result.error && isMissingColumnError(result.error, "full_name")) {
    payload = { ...basePayload };
    result = await db.from("users").upsert(usersWritePayload(payload), { onConflict: "id" }).select("id").single();
    logDbResult("public.users upsert (without full_name)", result);
  }

  if (result.error) {
    console.error("[upsertUserProfile] public.users failed", result.error);
    return { ok: false, step: "public.users", error: result.error.message };
  }

  return { ok: true };
}

async function upsertRiderProfilesRow(
  db: SupabaseClient,
  userId: string,
  input: SignupInput
): Promise<ProfileStepResult> {
  const mobile = input.mobile?.replace(/\s/g, "") ?? "";
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();
  const city = input.city.trim();

  const riderPayload = {
    id: userId,
    user_id: userId,
    full_name: name,
    email,
    city,
    mobile: mobile || null,
    updated_at: new Date().toISOString(),
  };

  console.log("[upsertUserProfile] rider_profiles upsert", { userId, riderPayload });
  let result = await db.from("rider_profiles").upsert(riderPayload, { onConflict: "id" }).select("id").single();
  logDbResult("rider_profiles upsert (onConflict id)", result);

  if (result.error && isMissingColumnError(result.error, "user_id", "updated_at")) {
    const fallback = {
      id: userId,
      full_name: name,
      email,
      city,
      mobile: mobile || null,
    };
    result = await db.from("rider_profiles").upsert(fallback, { onConflict: "id" }).select("id").single();
    logDbResult("rider_profiles upsert (legacy columns)", result);
  }

  if (result.error && isMissingTableError(result.error)) {
    console.warn("[upsertUserProfile] rider_profiles table missing — trying customer_profiles");
  } else if (result.error) {
    console.error("[upsertUserProfile] rider_profiles failed", result.error);
    return { ok: false, step: "rider_profiles", error: result.error.message };
  } else {
    return { ok: true };
  }

  const customerPayload = {
    user_id: userId,
    city,
    updated_at: new Date().toISOString(),
  };

  console.log("[upsertUserProfile] customer_profiles upsert", { userId, customerPayload });
  const customerResult = await db
    .from("customer_profiles")
    .upsert(customerPayload, { onConflict: "user_id" })
    .select("user_id")
    .single();
  logDbResult("customer_profiles upsert", customerResult);

  if (customerResult.error && isMissingColumnError(customerResult.error, "updated_at")) {
    const fallback = { user_id: userId, city };
    const retry = await db.from("customer_profiles").upsert(fallback, { onConflict: "user_id" }).select("user_id").single();
    logDbResult("customer_profiles upsert (without updated_at)", retry);
    if (retry.error) {
      return { ok: false, step: "customer_profiles", error: retry.error.message };
    }
    return { ok: true };
  }

  if (customerResult.error) {
    if (isMissingTableError(customerResult.error)) {
      console.warn("[upsertUserProfile] customer_profiles table missing — users row only");
      return { ok: true };
    }
    return { ok: false, step: "customer_profiles", error: customerResult.error.message };
  }

  return { ok: true };
}

async function upsertUserProfile(
  input: SignupInput,
  role: UserRole,
  userId: string
): Promise<ProfileStepResult> {
  const db = createAdminClient();

  try {
    const usersResult = await upsertPublicUsersRow(db, userId, input, role);
    if (!usersResult.ok) return usersResult;

    if (role === "rider") {
      const riderResult = await upsertRiderProfilesRow(db, userId, input);
      if (!riderResult.ok) return riderResult;
    }

    console.log("[upsertUserProfile] complete", { userId, role });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown profile save error";
    console.error("[upsertUserProfile] exception", error);
    return { ok: false, step: "upsertUserProfile", error: message };
  }
}

async function sendRiderVerificationEmail(email: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${siteUrl()}/login/rider?verified=1` },
    });
    if (error) {
      console.warn("[signUpWithRole] verification email resend failed", error.message);
    } else {
      console.log("[signUpWithRole] verification email sent", { email });
    }
  } catch (error) {
    console.warn("[signUpWithRole] verification email exception", error);
  }
}

async function rollbackAuthUser(userId: string) {
  try {
    const db = createAdminClient();
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[signUpWithRole] rollback deleteUser failed", error.message);
    } else {
      console.log("[signUpWithRole] rolled back auth user", { userId });
    }
  } catch (error) {
    console.error("[signUpWithRole] rollback exception", error);
  }
}

async function getRoleForUser(userId: string): Promise<UserRole | null> {
  const db = createAdminClient();
  const { data } = await db.from("users").select("role").eq("id", userId).maybeSingle();
  return normalizeRole((data as { role?: unknown } | null)?.role);
}

async function signUpWithRole(input: SignupInput, role: UserRole): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[signUpWithRole] config error", configError);
    return { success: false, error: configError };
  }

  if (!input.name.trim()) return { success: false, error: "Name is required" };
  if (!input.email.trim()) return { success: false, error: "Email is required" };
  if (!input.city.trim()) return { success: false, error: "City is required" };

  const mobile = input.mobile?.replace(/\s/g, "") ?? "";
  if (mobile && !MOBILE_REGEX.test(mobile)) {
    return { success: false, error: "Enter a valid mobile number" };
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) return { success: false, error: passwordError };

  const email = input.email.toLowerCase().trim();
  const db = createAdminClient();

  console.log("[signUpWithRole] auth.admin.createUser start", { email, role });

  try {
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: role !== "rider",
      user_metadata: {
        name: input.name.trim(),
        mobile,
        city: input.city.trim(),
        role,
      },
    });

    logDbResult("auth.admin.createUser", { data: authData.user ? { id: authData.user.id } : null, error: authError });

    if (authError) {
      const message = authError.message.includes("already been registered")
        ? "An account with this email already exists. Please sign in."
        : authError.message;
      return { success: false, error: message };
    }

    if (!authData.user) {
      return { success: false, error: "Signup failed. Please try again." };
    }

    const userId = authData.user.id;
    console.log("[signUpWithRole] auth user created", { userId, role, email });

    const profileResult = await upsertUserProfile(input, role, userId);
    if (!profileResult.ok) {
      console.error("[signUpWithRole] profile save failed — rolling back", profileResult);
      await rollbackAuthUser(userId);
      return {
        success: false,
        error: `Could not save ${profileResult.step}: ${profileResult.error}`,
      };
    }

    if (role === "rider" && !authData.user.email_confirmed_at) {
      await sendRiderVerificationEmail(email);
    }

    return { success: true, data: { id: userId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    console.error("[signUpWithRole] exception", error);
    return { success: false, error: message };
  }
}

/** @deprecated Use signUpRider */
export async function signUpUser(input: SignupInput): Promise<ActionResult<{ id: string }>> {
  return signUpRider(input);
}

export async function signUpRider(input: SignupInput): Promise<ActionResult<{ id: string }>> {
  return signUpWithRole(input, "rider");
}

export async function signUpOwner(input: SignupInput): Promise<ActionResult<{ id: string }>> {
  return signUpWithRole(input, "owner");
}

export async function signInWithRole(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const expectedRole = normalizeRole(String(formData.get("role") ?? ""));
  const loginPath =
    String(formData.get("loginPath") ?? "") ||
    (expectedRole ? ROLE_LOGIN_PATHS[expectedRole] : "/login/rider");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
    await supabase.auth.signOut();
    redirect(
      `${loginPath}?email=${encodeURIComponent(email)}&unverified=1&error=${encodeURIComponent("Please verify your email before logging in.")}`
    );
  }

  const role =
    (data.user ? await getRoleForUser(data.user.id) : null) ??
    normalizeRole(data.user?.user_metadata?.role) ??
    "rider";

  if (expectedRole && role !== expectedRole) {
    await supabase.auth.signOut();
    const message =
      expectedRole === "admin"
        ? `This account is registered as "${role}", not admin. Vehicle owners should use /login/owner. To grant admin access, run supabase/RUN_MAKE_ADMIN.sql in Supabase SQL Editor.`
        : "This account does not have access to this area.";
    redirect(`${loginPath}?error=${encodeURIComponent(message)}`);
  }

  redirect(ROLE_REDIRECTS[role]);
}

export async function signInUser(formData: FormData) {
  return signInWithRole(formData);
}

export async function signOutUser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const loginPath = String(formData.get("loginPath") ?? "/forgot-password");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/reset-password`,
  });
  if (error) redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  redirect(`${loginPath}?success=${encodeURIComponent("Password reset email sent. Please check your inbox.")}`);
}

export async function resendVerificationEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const loginPath = String(formData.get("loginPath") ?? "/login/rider");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl()}${loginPath}?verified=1` },
  });
  if (error) redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  redirect(`${loginPath}?success=${encodeURIComponent("Verification email sent. Please check your inbox.")}`);
}

export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  const passwordError = validatePassword(newPassword);
  if (passwordError) redirect(`${returnTo}?passwordError=${encodeURIComponent(passwordError)}`);
  if (newPassword !== confirmPassword) {
    redirect(`${returnTo}?passwordError=${encodeURIComponent("Passwords do not match")}`);
  }

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user?.email) redirect("/login/rider");

  const { error: currentError } = await supabase.auth.signInWithPassword({
    email: data.user.email,
    password: currentPassword,
  });
  if (currentError) {
    redirect(`${returnTo}?passwordError=${encodeURIComponent("Current password is incorrect")}`);
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) redirect(`${returnTo}?passwordError=${encodeURIComponent(error.message)}`);
  redirect(`${returnTo}?passwordSuccess=${encodeURIComponent("Password updated successfully")}`);
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return (await getRoleForUser(data.user.id)) ?? normalizeRole(data.user.user_metadata?.role);
}

export async function requireRole(role: UserRole | "user") {
  const expectedRole: UserRole = role === "user" ? "rider" : role;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect(ROLE_LOGIN_PATHS[expectedRole]);
  }

  const currentRole =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "rider";

  if (currentRole !== expectedRole) {
    redirect(ROLE_REDIRECTS[currentRole]);
  }

  return { user: data.user, role: currentRole };
}
