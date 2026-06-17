import { createAdminClient } from "@/lib/supabase/admin";

/** Generate human-readable booking ID: RYD202600001 */
export async function generateBookingReference(): Promise<string> {
  const year = new Date().getFullYear();
  const db = createAdminClient();

  const { data, error } = await db.rpc("next_booking_reference", { p_year: year });

  if (!error && typeof data === "string") {
    return data;
  }

  // Fallback when migration not yet applied
  const { count } = await db.from("bookings").select("id", { count: "exact", head: true });
  const seq = (count ?? 0) + 1;
  return `RYD${year}${String(seq).padStart(5, "0")}`;
}
