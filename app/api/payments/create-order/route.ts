import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/services/payments";
import { assertSameOrigin, requireAmount, requireString } from "@/lib/services/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const result = await createRazorpayOrder({
      bookingId: requireString(body.bookingId, "Booking ID"),
      amount: requireAmount(body.amount),
      currency: body.currency,
      userId: body.userId,
      ownerId: body.ownerId,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
