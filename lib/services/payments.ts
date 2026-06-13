import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

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
}) {
  const { keySecret } = getRazorpayConfig();
  const expected = createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  if (expected !== input.razorpaySignature) throw new Error("Invalid payment signature");

  const db = createAdminClient();
  await db
    .from("payments")
    .update({
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature,
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", input.razorpayOrderId);

  await db
    .from("bookings")
    .update({ payment_status: "paid", booking_status: "confirmed" })
    .eq("id", input.bookingId);

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
  await db.from("bookings").update({ payment_status: "refunded", booking_status: "refunded" }).eq("id", input.bookingId);

  return payload;
}
