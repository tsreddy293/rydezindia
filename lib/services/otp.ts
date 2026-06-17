import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireValidMobile } from "@/lib/services/validation";

const OTP_TTL_MS = 5 * 60 * 1000;

function hashOtp(mobile: string, otp: string) {
  const salt = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "rydezindia";
  return createHash("sha256").update(`${mobile}:${otp}:${salt}`).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 999999));
}

async function deliverOtp(mobile: string, otp: string) {
  const { dispatchMessage } = await import("@/lib/services/messaging");
  await dispatchMessage({
    channel: "sms",
    recipient: mobile,
    template: "otp",
    payload: { otp },
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP] ${mobile}: ${otp}`);
  }
}

export async function sendOtp(input: { mobile: string; purpose?: string }) {
  const mobile = requireValidMobile(input.mobile);
  const purpose = input.purpose || "signup";
  const otp = generateOtp();
  const db = createAdminClient();
  const { error } = await db.from("auth_otps").insert({
    mobile,
    purpose,
    otp_hash: hashOtp(mobile, otp),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  if (error) throw new Error(error.message);
  await deliverOtp(mobile, otp);

  return {
    mobile,
    expiresInSeconds: OTP_TTL_MS / 1000,
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

export async function verifyOtp(input: { mobile: string; otp: string; purpose?: string }) {
  const mobile = requireValidMobile(input.mobile);
  const purpose = input.purpose || "signup";
  const otp = String(input.otp ?? "").trim();
  if (!/^\d{6}$/.test(otp)) throw new Error("Enter a valid 6-digit OTP");

  const db = createAdminClient();
  const { data, error } = await db
    .from("auth_otps")
    .select("id, otp_hash, expires_at, verified_at, attempts")
    .eq("mobile", mobile)
    .eq("purpose", purpose)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("OTP not found. Please request a new OTP.");

  const row = data as { id: string; otp_hash: string; expires_at: string; attempts: number };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("OTP has expired. Please request a new OTP.");
  }
  if (row.attempts >= 5) throw new Error("Too many attempts. Please request a new OTP.");

  const expected = hashOtp(mobile, otp);
  if (expected !== row.otp_hash) {
    await db.from("auth_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new Error("Invalid OTP");
  }

  const verifiedAt = new Date().toISOString();
  await db.from("auth_otps").update({ verified_at: verifiedAt }).eq("id", row.id);
  await db.from("users").update({ mobile_verified: true, otp_verified_at: verifiedAt }).eq("mobile", mobile);
  await db.from("owners").update({ mobile_verified: true, otp_verified_at: verifiedAt }).eq("mobile", mobile);

  return { mobile, verifiedAt };
}
