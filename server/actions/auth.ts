"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfigError } from "@/lib/supabase/env";
import type { ActionResult, UserRole } from "@/types/database";

const MOBILE_REGEX = /^[6-9]\d{9}$/;

type SignupInput = {
  name: string;
  email: string;
  mobile: string;
  city: string;
  password: string;
};

const ROLE_REDIRECTS: Record<UserRole, string> = {
  user: "/",
  owner: "/owner/dashboard",
  admin: "/admin",
};

const ROLE_LOGIN_PATHS: Record<UserRole, string> = {
  user: "/login",
  owner: "/owner/login",
  admin: "/admin/login",
};

function normalizeRole(value: unknown): UserRole | null {
  return value === "user" || value === "owner" || value === "admin" ? value : null;
}

async function upsertUserProfile(input: SignupInput, role: UserRole, userId: string) {
  const db = createAdminClient();
  const mobile = input.mobile.replace(/\s/g, "");
  const email = input.email.toLowerCase().trim();
  const userPayload = {
    id: userId,
    name: input.name.trim(),
    full_name: input.name.trim(),
    email,
    mobile,
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
  const { data } = await db
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return normalizeRole((data as { role?: unknown } | null)?.role);
}

async function signUpWithRole(input: SignupInput, role: UserRole): Promise<ActionResult<{ id: string }>> {
  const configError = getSupabaseConfigError();
  if (configError) return { success: false, error: configError };
  if (!input.name.trim()) return { success: false, error: "Name is required" };
  if (!input.email.trim()) return { success: false, error: "Email is required" };
  if (!MOBILE_REGEX.test(input.mobile.replace(/\s/g, ""))) {
    return { success: false, error: "Enter a valid mobile number" };
  }
  if (input.password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const db = createAdminClient();
  const mobile = input.mobile.replace(/\s/g, "");
  const email = input.email.toLowerCase().trim();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name.trim(),
      mobile,
      city: input.city.trim(),
      role,
    },
  });

  if (error) return { success: false, error: error.message };

  await upsertUserProfile(input, role, data.user.id);
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: input.password });

  return { success: true, data: { id: data.user.id } };
}

export async function signUpUser(input: SignupInput): Promise<ActionResult<{ id: string }>> {
  return signUpWithRole(input, "user");
}

export async function signUpOwner(input: SignupInput): Promise<ActionResult<{ id: string }>> {
  return signUpWithRole(input, "owner");
}

export async function signInWithRole(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const expectedRole = normalizeRole(String(formData.get("role") ?? ""));
  const loginPath = String(formData.get("loginPath") ?? (expectedRole ? ROLE_LOGIN_PATHS[expectedRole] : "/login"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`${loginPath}?error=${encodeURIComponent(error.message)}`);
  }

  const role =
    (data.user ? await getRoleForUser(data.user.id) : null) ??
    normalizeRole(data.user?.user_metadata?.role) ??
    "user";

  if (expectedRole && role !== expectedRole) {
    await supabase.auth.signOut();
    redirect(`${loginPath}?error=${encodeURIComponent("This account does not have access to this area.")}`);
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

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return (await getRoleForUser(data.user.id)) ?? normalizeRole(data.user.user_metadata?.role);
}

export async function requireRole(role: UserRole) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect(ROLE_LOGIN_PATHS[role]);
  }

  const currentRole =
    (await getRoleForUser(data.user.id)) ??
    normalizeRole(data.user.user_metadata?.role) ??
    "user";

  if (currentRole !== role) {
    redirect(ROLE_REDIRECTS[currentRole]);
  }

  return { user: data.user, role: currentRole };
}
