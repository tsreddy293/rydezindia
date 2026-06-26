import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserName } from "@/lib/users/display-name";

export interface RiderBookingProfile {
  name: string;
  email: string;
  mobile: string;
}

export interface RiderWelcomeProfile {
  displayName: string;
  firstName: string;
  memberSince: string;
  verificationLabel: string;
  averageRating: number | null;
}

export function extractFirstName(fullName: string, fallback = "Rider"): string {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed.toLowerCase() === "rider") return fallback;
  return trimmed.split(/\s+/)[0] || fallback;
}

export function buildRiderVerificationLabel(input: {
  kycStatus: string;
  emailVerified: boolean;
  showKycSection: boolean;
}): string {
  if (input.showKycSection) {
    if (input.kycStatus === "approved") return "Verified Rider";
    if (input.kycStatus === "pending") return "KYC Pending";
    if (input.kycStatus === "rejected") return "KYC Rejected";
    if (input.kycStatus === "not_submitted") return "KYC Required";
  }
  if (input.emailVerified) return "Email Verified";
  return "Verification Pending";
}

function authMetaFromUser(user: User) {
  return {
    email: user.email,
    name: String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? "").trim(),
    full_name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim(),
    mobile: String(user.user_metadata?.mobile ?? "").trim(),
  };
}

export async function getRiderDisplayName(
  userId: string,
  authMeta?: { email?: string | null; name?: string; full_name?: string; mobile?: string },
  fallback = "Rider"
): Promise<string> {
  try {
    const db = createAdminClient();
    const [{ data: userRow }, { data: profileRow }] = await Promise.all([
      db.from("users").select("name, full_name").eq("id", userId).maybeSingle(),
      db.from("customer_profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    ]);

    const profile = profileRow as { full_name?: string } | null;
    const user = userRow as { name?: string; full_name?: string } | null;

    const fromProfile = profile?.full_name?.trim();
    if (fromProfile) return fromProfile;

    const fromMeta = String(authMeta?.full_name ?? authMeta?.name ?? "").trim();
    if (fromMeta) return fromMeta;

    return resolveUserName(user, fallback);
  } catch {
    const fromMeta = String(authMeta?.full_name ?? authMeta?.name ?? "").trim();
    return fromMeta || fallback;
  }
}

export async function getRiderWelcomeProfile(
  user: User,
  options: { kycStatus: string; showKycSection: boolean }
): Promise<RiderWelcomeProfile> {
  const authMeta = authMetaFromUser(user);
  const emailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);

  let averageRating: number | null = null;
  try {
    const db = createAdminClient();
    const { data } = await db.from("users").select("rating").eq("id", user.id).maybeSingle();
    const rating = Number((data as { rating?: number } | null)?.rating);
    if (Number.isFinite(rating) && rating > 0) {
      averageRating = Math.round(rating * 10) / 10;
    }
  } catch {
    averageRating = null;
  }

  const displayName = await getRiderDisplayName(user.id, authMeta, "Rider");

  return {
    displayName,
    firstName: extractFirstName(displayName, "Rider"),
    memberSince: user.created_at ?? new Date().toISOString(),
    verificationLabel: buildRiderVerificationLabel({
      kycStatus: options.kycStatus,
      emailVerified,
      showKycSection: options.showKycSection,
    }),
    averageRating,
  };
}

export async function getRiderBookingProfile(
  userId: string,
  authMeta?: { email?: string | null; name?: string; mobile?: string }
): Promise<RiderBookingProfile> {
  try {
    const db = createAdminClient();
    const [{ data: userRow }, { data: profileRow }] = await Promise.all([
      db.from("users").select("name, full_name, mobile, email").eq("id", userId).maybeSingle(),
      db.from("customer_profiles").select("full_name, mobile, email").eq("user_id", userId).maybeSingle(),
    ]);

    const user = userRow as { name?: string; full_name?: string; mobile?: string; email?: string } | null;
    const profile = profileRow as { full_name?: string; mobile?: string; email?: string } | null;

    return {
      name:
        profile?.full_name?.trim() ||
        resolveUserName(user, authMeta?.name?.trim() || "Rider"),
      email: profile?.email?.trim() || user?.email?.trim() || authMeta?.email?.trim() || "",
      mobile:
        profile?.mobile?.trim() ||
        user?.mobile?.trim() ||
        authMeta?.mobile?.trim() ||
        "",
    };
  } catch {
    return {
      name: authMeta?.name?.trim() || "Rider",
      email: authMeta?.email?.trim() || "",
      mobile: authMeta?.mobile?.trim() || "",
    };
  }
}
