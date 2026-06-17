import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayPayment } from "@/lib/services/payments";
import { assertSameOrigin, requireString } from "@/lib/services/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const result = await verifyRazorpayPayment({
      bookingId: requireString(body.bookingId, "Booking ID"),
      razorpayOrderId: requireString(body.razorpayOrderId, "Razorpay order ID"),
      razorpayPaymentId: requireString(body.razorpayPaymentId, "Razorpay payment ID"),
      razorpaySignature: requireString(body.razorpaySignature, "Razorpay signature"),
      paymentType: body.paymentType === "advance" ? "advance" : "full",
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 400 }
    );
  }
}
