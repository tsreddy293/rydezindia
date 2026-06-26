import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayPayment } from "@/lib/services/payments";
import { assertSameOrigin, requireString } from "@/lib/services/validation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const bookingId = requireString(body.bookingId, "Booking ID");
    const razorpayOrderId = requireString(body.razorpayOrderId, "Razorpay order ID");

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const db = createAdminClient();
    const { data: paymentRow } = await db
      .from("payments")
      .select("booking_id, user_id")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (!paymentRow) {
      return NextResponse.json({ success: false, error: "Payment order not found" }, { status: 404 });
    }

    const paymentBookingId = String((paymentRow as { booking_id?: string }).booking_id ?? "");
    if (paymentBookingId && paymentBookingId !== bookingId) {
      return NextResponse.json({ success: false, error: "Booking does not match payment" }, { status: 400 });
    }

    const paymentUserId = String((paymentRow as { user_id?: string }).user_id ?? "");
    if (paymentUserId && paymentUserId !== authData.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { data: booking } = await db
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .maybeSingle();

    const bookingUserId = String((booking as { user_id?: string } | null)?.user_id ?? "");
    if (bookingUserId && bookingUserId !== authData.user.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const result = await verifyRazorpayPayment({
      bookingId,
      razorpayOrderId,
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
