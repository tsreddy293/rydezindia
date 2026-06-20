import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerKyc, hasCustomerKycRecord } from "@/lib/services/customer-kyc";
import { isMissingColumnError, isMissingTableError } from "@/lib/supabase/errors";

export async function markSelfDriveInterest(userId: string): Promise<void> {
  try {
    const db = createAdminClient();
    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      self_drive_interest: true,
      self_drive_interest_at: now,
      updated_at: now,
    };

    const { error } = await db.from("customer_profiles").upsert(payload, { onConflict: "user_id" });
    if (error && !isMissingColumnError(error, "self_drive_interest") && !isMissingTableError(error)) {
      console.warn("[markSelfDriveInterest]", error.message);
    }
  } catch (err) {
    console.warn("[markSelfDriveInterest]", err);
  }
}

export async function hasSelfDriveInterest(userId: string): Promise<boolean> {
  try {
    const db = createAdminClient();

    const { data: profile, error: profileError } = await db
      .from("customer_profiles")
      .select("self_drive_interest")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileError && (profile as { self_drive_interest?: boolean } | null)?.self_drive_interest) {
      return true;
    }

    const kyc = await getCustomerKyc(userId);
    if (hasCustomerKycRecord(kyc)) return true;

    const { count, error: bookingError } = await db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("booking_type", "self_drive");

    if (!bookingError && (count ?? 0) > 0) return true;

    return false;
  } catch (err) {
    console.warn("[hasSelfDriveInterest]", err);
    return false;
  }
}

export async function shouldShowRiderKyc(userId: string): Promise<boolean> {
  return hasSelfDriveInterest(userId);
}
