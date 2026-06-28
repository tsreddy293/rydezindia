import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/services/payments";
import { assertSameOrigin, requireAmount, requireString } from "@/lib/services/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import { getAdvancePaymentAmount } from "@/lib/pricing/ai-pricing-engine";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const bookingId = requireString(body.bookingId, "Booking ID");

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.id) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const db = createAdminClient();
    const { data: booking } = await db
      .from("bookings")
      .select("user_id, owner_id, mobile, amount, booking_status, payment_status, booking_type")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const bookingRow = booking as {
      user_id?: string;
      owner_id?: string;
      amount?: number;
      booking_status?: string;
      payment_status?: string;
    };

    if (
      isBookingCancelledStatus(bookingRow.booking_status) ||
      String(bookingRow.payment_status ?? "").toLowerCase() === "paid"
    ) {
      return NextResponse.json({ success: false, error: "Booking is not payable" }, { status: 400 });
    }

    const paymentType = body.paymentType === "advance" ? "advance" : "full";
    const totalAmount = Number(bookingRow.amount ?? 0);
    const amount = requireAmount(body.amount);

    const bookingUserId = String(bookingRow.user_id ?? "").trim();
    if (bookingUserId && bookingUserId !== authData.user.id) {
      const bookingMobile = String((booking as { mobile?: string }).mobile ?? "").replace(/\s/g, "");
      const { data: authProfile } = await db
        .from("users")
        .select("mobile")
        .eq("id", authData.user.id)
        .maybeSingle();
      const authMobile = String((authProfile as { mobile?: string } | null)?.mobile ?? "").replace(
        /\s/g,
        ""
      );
      if (bookingMobile && authMobile && bookingMobile === authMobile) {
        await db.from("bookings").update({ user_id: authData.user.id }).eq("id", bookingId);
      } else {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
    } else if (!bookingUserId) {
      await db.from("bookings").update({ user_id: authData.user.id }).eq("id", bookingId);
    }

    if (totalAmount > 0) {
      const advanceMinimum = getAdvancePaymentAmount(totalAmount, "advance");
      if (paymentType === "advance") {
        if (amount < advanceMinimum - 1) {
          return NextResponse.json(
            { success: false, error: "Advance amount is below the minimum due" },
            { status: 400 }
          );
        }
        if (amount > totalAmount * 1.5) {
          return NextResponse.json(
            { success: false, error: "Payment amount exceeds booking total" },
            { status: 400 }
          );
        }
      } else if (Math.abs(amount - totalAmount) > 1 && amount > totalAmount * 1.5) {
        return NextResponse.json(
          { success: false, error: "Amount does not match booking" },
          { status: 400 }
        );
      }
    }

    const result = await createRazorpayOrder({
      bookingId,
      amount,
      currency: body.currency,
      userId: authData.user.id,
      ownerId: bookingRow.owner_id ?? undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
