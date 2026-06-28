import { createAdminClient } from "@/lib/supabase/admin";

const RESUME_WINDOW_MS = 30 * 60 * 1000;

export interface ResumableBooking {
  id: string;
  booking_reference?: string | null;
  amount?: number;
  payment_status?: string;
  booking_status?: string;
}

/** Returns a recent pending-payment booking for the same trip to prevent duplicates. */
export async function findResumablePendingBooking(input: {
  userId: string;
  vehicleId?: string | null;
  referenceId?: string | null;
  pickupDate?: string | null;
  bookingType?: string;
}): Promise<ResumableBooking | null> {
  const db = createAdminClient();
  const since = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();

  let query = db
    .from("bookings")
    .select("id, booking_reference, amount, payment_status, booking_status, created_at")
    .eq("user_id", input.userId)
    .eq("payment_status", "pending")
    .in("booking_status", ["pending", "confirmed"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.bookingType) {
    query = query.eq("booking_type", input.bookingType);
  }
  if (input.vehicleId) {
    query = query.eq("vehicle_id", input.vehicleId);
  }
  if (input.referenceId) {
    query = query.eq("reference_id", input.referenceId);
  }
  if (input.pickupDate) {
    query = query.eq("pickup_date", input.pickupDate);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as ResumableBooking;
}
