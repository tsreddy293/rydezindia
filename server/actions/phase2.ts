"use server";

import { revalidatePath } from "next/cache";
import { submitReview, type ReviewInput } from "@/lib/services/reviews";
import { upsertEmergencyContacts, triggerSos } from "@/lib/services/safety";
import { validateCoupon, redeemCoupon } from "@/lib/services/coupons";
import { applyReferralCode, getReferralStats } from "@/lib/services/referrals";
import { getWalletBalance, getWalletTransactions } from "@/lib/services/wallet";
import { getLoyaltyStatus, addLoyaltyPoints } from "@/lib/services/loyalty";
import { completeReferral } from "@/lib/services/referrals";
import { requireRole } from "@/server/actions/auth";
import type { ActionResult } from "@/types/database";

export async function submitTripReview(input: Omit<ReviewInput, "userId">): Promise<ActionResult> {
  const { user } = await requireRole("user");
  try {
    await submitReview({ ...input, userId: user.id });
    await addLoyaltyPoints(user.id, 50);
    revalidatePath("/user/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to submit review" };
  }
}

export async function saveEmergencyContacts(formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("user");
  try {
    await upsertEmergencyContacts({
      userId: user.id,
      contact1Name: String(formData.get("contact1_name") ?? ""),
      contact1Phone: String(formData.get("contact1_phone") ?? ""),
      contact2Name: String(formData.get("contact2_name") ?? ""),
      contact2Phone: String(formData.get("contact2_phone") ?? ""),
    });
    revalidatePath("/user/profile/safety");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save contacts" };
  }
}

export async function activateSos(input: {
  bookingId?: string;
  latitude?: number;
  longitude?: number;
}): Promise<ActionResult<{ sosId: string }>> {
  const { user } = await requireRole("user");
  try {
    const sosId = await triggerSos({ userId: user.id, ...input });
    return { success: true, data: { sosId } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "SOS failed" };
  }
}

export async function applyCouponCode(code: string, orderAmount: number) {
  const { user } = await requireRole("user");
  return validateCoupon({ code, userId: user.id, orderAmount });
}

export async function redeemCouponForBooking(input: {
  couponId: string;
  bookingId: string;
  discountAmount: number;
}) {
  const { user } = await requireRole("user");
  await redeemCoupon({ ...input, userId: user.id });
}

export async function useReferralCode(code: string): Promise<ActionResult> {
  const { user } = await requireRole("user");
  try {
    await applyReferralCode({ newUserId: user.id, referralCode: code });
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid referral code" };
  }
}

export async function fetchReferralStats() {
  const { user } = await requireRole("user");
  return getReferralStats(user.id);
}

export async function fetchWalletData() {
  const { user } = await requireRole("user");
  const [balance, transactions] = await Promise.all([
    getWalletBalance(user.id),
    getWalletTransactions(user.id),
  ]);
  return { balance, transactions };
}

export async function fetchLoyaltyStatus(userId?: string) {
  try {
    const resolvedUserId = userId ?? (await requireRole("user")).user.id;
    return getLoyaltyStatus(resolvedUserId);
  } catch (error) {
    console.error("[fetchLoyaltyStatus]", error);
    const { DEFAULT_LOYALTY_STATUS } = await import("@/lib/services/loyalty");
    return DEFAULT_LOYALTY_STATUS;
  }
}

export async function onBookingCompleted(userId: string) {
  await completeReferral(userId);
  await addLoyaltyPoints(userId, 100);
}
