import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/services/otp";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";
import { assertSameOrigin } from "@/lib/services/validation";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const key = `otp:${getClientIp(request.headers)}:${body.mobile ?? ""}`;
    const rate = checkRateLimit(key, 3, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
    }

    const result = await sendOtp({ mobile: body.mobile, purpose: body.purpose });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send OTP" },
      { status: 400 }
    );
  }
}
