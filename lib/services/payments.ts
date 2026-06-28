import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

function toPaise(amount: number) {
  return Math.round(amount * 100);
}

export async function createRazorpayOrder(input: {
  bookingId: string;
  amount: number;
  currency?: string;
  userId?: string;
  ownerId?: string;
}) {
  const { keyId, keySecret } = getRazorpayConfig();
  const currency = input.currency || "INR";
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: toPaise(input.amount),
      currency,
      receipt: input.bookingId,
      notes: { booking_id: input.bookingId },
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.description || "Failed to create Razorpay order");

  const db = createAdminClient();

  const { data: existingOpen } = await db
    .from("payments")
    .select("id, razorpay_order_id, amount, metadata, status")
    .eq("booking_id", input.bookingId)
    .eq("status", "created")
    .eq("amount", input.amount)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpen) {
    const row = existingOpen as {
      id: string;
      razorpay_order_id?: string;
      metadata?: unknown;
    };
    if (row.razorpay_order_id) {
      const { keyId } = getRazorpayConfig();
      return {
        paymentRecordId: row.id,
        order: (row.metadata as Record<string, unknown>) ?? { id: row.razorpay_order_id },
        keyId,
      };
    }
  }

  const { data, error } = await db
    .from("payments")
    .insert({
      booking_id: input.bookingId,
      user_id: input.userId || null,
      owner_id: input.ownerId || null,
      razorpay_order_id: payload.id,
      amount: input.amount,
      currency,
      status: "created",
      metadata: payload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { paymentRecordId: data.id as string, order: payload, keyId };
}

export async function verifyRazorpayPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentType?: "advance" | "full";
}) {
  const { keySecret } = getRazorpayConfig();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  if (expected !== input.razorpaySignature) throw new Error("Invalid payment signature");

  const db = createAdminClient();

  const { data: paymentRow } = await db
    .from("payments")
    .select("id, amount, owner_id, user_id, booking_id, status")
    .eq("razorpay_order_id", input.razorpayOrderId)
    .maybeSingle();

  if (!paymentRow) throw new Error("Payment record not found");

  const paymentBookingId = String((paymentRow as { booking_id?: string }).booking_id ?? "").trim();
  if (paymentBookingId && paymentBookingId !== input.bookingId) {
    throw new Error("Booking does not match payment order");
  }

  const resolvedBookingId = paymentBookingId || input.bookingId;

  const { data: existingBooking } = await db
    .from("bookings")
    .select("owner_id, amount, platform_fee, booking_status, payment_status, user_id")
    .eq("id", resolvedBookingId)
    .maybeSingle();

  if (!existingBooking) throw new Error("Booking not found");

  const booking = existingBooking as {
    owner_id?: string;
    amount?: number;
    platform_fee?: number;
    booking_status?: string;
    payment_status?: string;
    user_id?: string | null;
  };

  if (
    isBookingCancelledStatus(booking.booking_status) ||
    String(booking.booking_status ?? "").toLowerCase() === "refunded"
  ) {
    throw new Error("Cannot verify payment for a cancelled or refunded booking");
  }

  const currentPayment = String(booking.payment_status ?? "").toLowerCase();
  if (currentPayment === "paid" || currentPayment === "partial") {
    return { verified: true };
  }

  await db
    .from("payments")
    .update({
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature,
      status: "paid",
      payment_type: input.paymentType ?? "full",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", input.razorpayOrderId);

  const paymentUserId = (paymentRow as { user_id?: string }).user_id;
  const bookingUpdate: Record<string, unknown> = {
    payment_status: input.paymentType === "advance" ? "partial" : "paid",
    booking_status: "confirmed",
  };
  if (paymentUserId && !booking.user_id) {
    bookingUpdate.user_id = paymentUserId;
  }

  await db.from("bookings").update(bookingUpdate).eq("id", resolvedBookingId);

  const gross = Number(
    (paymentRow as { amount?: number }).amount ?? booking.amount ?? 0
  );
  const platformFee = Number(booking.platform_fee ?? Math.round(gross * 0.05));
  const ownerId = booking.owner_id ?? (paymentRow as { owner_id?: string }).owner_id;

  if (ownerId) {
    const { data: existingEarning } = await db
      .from("owner_earnings")
      .select("id")
      .eq("booking_id", resolvedBookingId)
      .maybeSingle();

    if (!existingEarning) {
      await db.from("owner_earnings").insert({
        owner_id: ownerId,
        booking_id: resolvedBookingId,
        payment_id: (paymentRow as { id?: string }).id ?? null,
        gross_amount: gross,
        platform_fee: platformFee,
        net_amount: gross - platformFee,
        status: "pending",
      });
    }
  }

  const { data: fullBooking } = await db
    .from("bookings")
    .select("mobile, passenger_name, booking_reference, owner_id")
    .eq("id", resolvedBookingId)
    .maybeSingle();

  const mobile = (fullBooking as { mobile?: string } | null)?.mobile;
  if (mobile) {
    const { dispatchBookingEvent } = await import("@/lib/services/messaging");
    await dispatchBookingEvent({
      event: "payment_success",
      customerMobile: mobile,
      payload: {
        bookingReference: (fullBooking as { booking_reference?: string }).booking_reference,
        amount: gross,
      },
    });
  }

  return { verified: true };
}

export async function refundRazorpayPayment(input: {
  bookingId: string;
  paymentId: string;
  razorpayPaymentId: string;
  amount: number;
  reason?: string;
}) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/payments/${input.razorpayPaymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: toPaise(input.amount), notes: { reason: input.reason ?? "Booking refund" } }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.description || "Failed to create refund");

  const db = createAdminClient();
  await db.from("refunds").insert({
    payment_id: input.paymentId,
    booking_id: input.bookingId,
    razorpay_refund_id: payload.id,
    amount: input.amount,
    status: "processed",
    reason: input.reason || null,
    metadata: payload,
  });
  await db.from("payments").update({ status: "refunded" }).eq("id", input.paymentId);

  const { data: bookingRow } = await db
    .from("bookings")
    .select("booking_status")
    .eq("id", input.bookingId)
    .maybeSingle();

  const isCancelled =
    isBookingCancelledStatus(
      (bookingRow as { booking_status?: string } | null)?.booking_status
    ) ||
    String((bookingRow as { booking_status?: string } | null)?.booking_status ?? "").toLowerCase() ===
      "cancelled";

  await db
    .from("bookings")
    .update({
      payment_status: "refunded",
      ...(isCancelled ? {} : { booking_status: "refunded" }),
    })
    .eq("id", input.bookingId);

  await db
    .from("owner_earnings")
    .update({ status: "cancelled" })
    .eq("booking_id", input.bookingId);

  return payload;
}

export async function cancelOwnerEarningsForBooking(bookingId: string) {
  const db = createAdminClient();
  await db.from("owner_earnings").update({ status: "cancelled" }).eq("booking_id", bookingId);
}
