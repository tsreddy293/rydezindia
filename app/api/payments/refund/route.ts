import { NextRequest, NextResponse } from "next/server";
import { refundRazorpayPayment } from "@/lib/services/payments";
import { assertSameOrigin, requireAmount, requireString } from "@/lib/services/validation";
import { requireRole } from "@/server/actions/auth";

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    assertSameOrigin(request);
    const body = await request.json();
    const result = await refundRazorpayPayment({
      bookingId: requireString(body.bookingId, "Booking ID"),
      paymentId: requireString(body.paymentId, "Payment ID"),
      razorpayPaymentId: requireString(body.razorpayPaymentId, "Razorpay payment ID"),
      amount: requireAmount(body.amount),
      reason: body.reason,
    });
    return NextResponse.json({ success: true, refund: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to refund payment" },
      { status: 400 }
    );
  }
}
