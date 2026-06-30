import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/services/payments";
import { assertSameOrigin, requireAmount, requireString } from "@/lib/services/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBookingCancelledStatus } from "@/lib/bookings/cancellation-eligibility";
import { deriveSelfDrivePaymentSnapshot } from "@/lib/bookings/self-drive-payment";
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
      .select(
        "user_id, owner_id, mobile, amount, booking_status, payment_status, booking_type, special_instructions, trip_fare_amount, security_deposit_amount, advance_amount, balance_amount, amount_paid, amount_due"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const bookingRow = booking as Record<string, unknown>;
    const bookingType = String(bookingRow.booking_type ?? "").toLowerCase();
    const paymentStatus = String(bookingRow.payment_status ?? "").toLowerCase();
    const bookingStatus = String(bookingRow.booking_status ?? "").toLowerCase();

    if (isBookingCancelledStatus(String(bookingRow.booking_status ?? ""))) {
      return NextResponse.json({ success: false, error: "Booking is not payable" }, { status: 400 });
    }

    const isSelfDrive = bookingType === "self_drive";
    let paymentPhase = typeof body.paymentPhase === "string" ? body.paymentPhase : undefined;
    let expectedAmount = Number(bookingRow.amount ?? 0);

    if (isSelfDrive) {
      const snapshot = deriveSelfDrivePaymentSnapshot(bookingRow);
      if (!snapshot) {
        return NextResponse.json({ success: false, error: "Invalid self-drive booking" }, { status: 400 });
      }

      const balanceDue =
        paymentStatus === "partial" && snapshot.amountDue > 0;

      if (balanceDue) {
        paymentPhase = "self_drive_balance";
        expectedAmount = snapshot.amountDue;
      } else {
        paymentPhase = "self_drive_initial";
        expectedAmount = Number(bookingRow.amount ?? snapshot.advanceAmount + snapshot.securityDeposit);
      }

      if (paymentStatus === "paid" && snapshot.amountDue <= 0) {
        return NextResponse.json({ success: false, error: "Booking is already fully paid" }, { status: 400 });
      }
    } else if (paymentStatus === "paid") {
      return NextResponse.json({ success: false, error: "Booking is not payable" }, { status: 400 });
    }

    const paymentType = body.paymentType === "advance" ? "advance" : "full";
    const amount = requireAmount(body.amount);

    const bookingUserId = String(bookingRow.user_id ?? "").trim();
    if (bookingUserId && bookingUserId !== authData.user.id) {
      const bookingMobile = String(bookingRow.mobile ?? "").replace(/\s/g, "");
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

    if (expectedAmount > 0) {
      if (isSelfDrive) {
        if (Math.abs(amount - expectedAmount) > 1 && amount > expectedAmount * 1.05) {
          return NextResponse.json(
            { success: false, error: "Payment amount does not match amount due" },
            { status: 400 }
          );
        }
      } else if (paymentType === "advance") {
        const advanceMinimum = getAdvancePaymentAmount(expectedAmount, "advance");
        if (amount < advanceMinimum - 1) {
          return NextResponse.json(
            { success: false, error: "Advance amount is below the minimum due" },
            { status: 400 }
          );
        }
      } else if (Math.abs(amount - expectedAmount) > 1 && amount > expectedAmount * 1.5) {
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
      ownerId: String(bookingRow.owner_id ?? "") || undefined,
      paymentPhase,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
