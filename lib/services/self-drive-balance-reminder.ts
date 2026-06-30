import { createAdminClient } from "@/lib/supabase/admin";
import { deriveSelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";
import { createNotification } from "@/lib/services/notifications";
import { dispatchBookingEvent } from "@/lib/services/messaging";

function pickupWithin24Hours(pickupDate?: string | null, pickupTime?: string | null): boolean {
  if (!pickupDate) return false;
  const time = (pickupTime ?? "09:00").slice(0, 5);
  const pickup = new Date(`${pickupDate}T${time}:00`);
  if (Number.isNaN(pickup.getTime())) return false;
  const diffMs = pickup.getTime() - Date.now();
  return diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
}

export async function sendSelfDriveBalanceReminders(): Promise<{
  scanned: number;
  notified: number;
}> {
  const db = createAdminClient();
  const { data: rows } = await db
    .from("bookings")
    .select(
      "id, user_id, mobile, passenger_name, booking_reference, booking_status, payment_status, pickup_date, pickup_time, booking_type, special_instructions, trip_fare_amount, security_deposit_amount, advance_amount, balance_amount, amount_paid, amount_due"
    )
    .eq("booking_type", "self_drive")
    .eq("payment_status", "partial")
    .eq("booking_status", "confirmed")
    .limit(200);

  let notified = 0;
  for (const row of rows ?? []) {
    const booking = row as Record<string, unknown>;
    if (!pickupWithin24Hours(String(booking.pickup_date ?? ""), String(booking.pickup_time ?? ""))) {
      continue;
    }

    const snapshot = deriveSelfDrivePaymentSnapshot(booking);
    if (!snapshot || snapshot.amountDue <= 0) continue;

    const userId = String(booking.user_id ?? "").trim();
    const message = `Your remaining trip balance of ₹${snapshot.amountDue} is due before vehicle pickup.`;

    if (userId) {
      await createNotification({
        recipientId: userId,
        recipientRole: "rider",
        type: "balance_due_reminder",
        title: "Balance payment due before pickup",
        message,
        metadata: { bookingId: booking.id, amountDue: snapshot.amountDue },
      });
    }

    const mobile = String(booking.mobile ?? "").trim();
    if (mobile) {
      await dispatchBookingEvent({
        event: "balance_due_reminder",
        customerMobile: mobile,
        payload: {
          bookingReference: booking.booking_reference,
          amountDue: snapshot.amountDue,
        },
      });
    }

    notified += 1;
  }

  return { scanned: rows?.length ?? 0, notified };
}
