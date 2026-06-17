"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfigError } from "@/lib/supabase/env";
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

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://rydezindia.com").replace(/\/$/, "");
}

function validatePassword(password: string) {
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, and a number";
  }
  return null;
}

async function upsertUserProfile(input: SignupInput, role: UserRole, userId: string) {
  const db = createAdminClient();
  const mobile = input.mobile?.replace(/\s/g, "") ?? "";
  const email = input.email.toLowerCase().trim();
  const userPayload = {
    id: userId,
    name: input.name.trim(),
    full_name: input.name.trim(),
    email,
    mobile: mobile || null,
    city: input.city.trim(),
    role,
  } as Record<string, unknown>;

  const { error } = await db.from("users").upsert(userPayload);
  if (error?.message?.includes("column")) {
    delete userPayload.full_name;
    await db.from("users").upsert(userPayload);
  }
}

async function getRoleForUser(userId: string): Promise<UserRole | null> {
  const db = createAdminClient();
  const { data } = await db.from("users").select("role").eq("id", userId).maybeSingle();
  return normalizeRole((data as { role?: unknown } | null)?.role);
}

async function signUpWithRole(input: SignupInput, role: UserRole): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };
  if (!input.name.trim()) return { success: false, error: "Name is required" };
  if (!input.email.trim()) return { success: false, error: "Email is required" };
  const mobile = input.mobile?.replace(/\s/g, "") ?? "";
  if (mobile && !MOBILE_REGEX.test(mobile)) {
    return { success: false, error: "Enter a valid mobile number" };
  }
  const passwordError = validatePassword(input.password);
  if (passwordError) return { success: false, error: passwordError };

  const email = input.email.toLowerCase().trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl()}/login/rider?verified=1`,
      data: {
        name: input.name.trim(),
        mobile,
        city: input.city.trim(),
        role,
      },
    },
  });

  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Signup failed. Please try again." };

  await upsertUserProfile(input, role, data.user.id);
  await supabase.auth.signOut();

  return { success: true, data: { id: data.user.id } };
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
