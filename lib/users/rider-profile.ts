import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserName } from "@/lib/users/display-name";

export interface RiderBookingProfile {
  name: string;
  email: string;
  mobile: string;
}

export async function getRiderDisplayName(userId: string, fallback = "Rider"): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("users").select("name, full_name").eq("id", userId).maybeSingle();
    return resolveUserName(data as { name?: string; full_name?: string } | null, fallback);
  } catch {
    return fallback;
  }
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
