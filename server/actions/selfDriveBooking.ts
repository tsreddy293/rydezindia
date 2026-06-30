"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function getSelfDriveOwnerContact(
  bookingId: string
): Promise<ActionResult<{ name: string; mobile: string }>> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { success: false, error: "Unauthorized" };

  const db = createAdminClient();
  const { data: booking } = await db
    .from("bookings")
    .select("id, user_id, owner_id, booking_type, payment_status, booking_status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { success: false, error: "Booking not found" };

  const row = booking as Record<string, unknown>;
  if (String(row.booking_type ?? "").toLowerCase() !== "self_drive") {
    return { success: false, error: "Not a self-drive booking" };
  }

  if (String(row.user_id) !== auth.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const payment = String(row.payment_status ?? "").toLowerCase();
  const status = String(row.booking_status ?? "").toLowerCase();
  if (payment === "pending" || status === "cancelled") {
    return { success: false, error: "Owner contact available after payment" };
  }

  const ownerId = String(row.owner_id ?? "").trim();
  if (!ownerId) return { success: false, error: "Owner not found" };

  const { data: ownerUser } = await db
    .from("users")
    .select("name, mobile")
    .eq("id", ownerId)
    .maybeSingle();

  if (ownerUser) {
    return {
      success: true,
      data: {
        name: String((ownerUser as { name?: string }).name ?? "Vehicle Owner"),
        mobile: String((ownerUser as { mobile?: string }).mobile ?? ""),
      },
    };
  }

  const { data: legacyOwner } = await db
    .from("owners")
    .select("owner_name, mobile")
    .eq("id", ownerId)
    .maybeSingle();

  if (legacyOwner) {
    return {
      success: true,
      data: {
        name: String((legacyOwner as { owner_name?: string }).owner_name ?? "Vehicle Owner"),
        mobile: String((legacyOwner as { mobile?: string }).mobile ?? ""),
      },
    };
  }

  return { success: false, error: "Owner contact unavailable" };
}
