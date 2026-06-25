import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/services/payments";
import { assertSameOrigin, requireAmount, requireString } from "@/lib/services/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const bookingId = requireString(body.bookingId, "Booking ID");
    const amount = requireAmount(body.amount);

    const db = createAdminClient();
    const { data: booking } = await db
      .from("bookings")
      .select("user_id, owner_id, mobile")
      .eq("id", bookingId)
      .maybeSingle();

    const bookingRow = booking as { user_id?: string; owner_id?: string; mobile?: string } | null;

    let userId = bookingRow?.user_id ?? body.userId ?? null;
    let ownerId = bookingRow?.owner_id ?? body.ownerId ?? null;

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.id) {
      if (!userId) userId = authData.user.id;
      if (!bookingRow?.user_id) {
        await db.from("bookings").update({ user_id: authData.user.id }).eq("id", bookingId);
      }
    }

    const result = await createRazorpayOrder({
      bookingId,
      amount,
      currency: body.currency,
      userId: userId ?? undefined,
      ownerId: ownerId ?? undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 400 }
    );
  }
}
