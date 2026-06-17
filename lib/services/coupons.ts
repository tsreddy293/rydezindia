import { createAdminClient } from "@/lib/supabase/admin";

export interface CouponValidationResult {
  valid: boolean;
  couponId?: string;
  discountAmount: number;
  error?: string;
}

export async function validateCoupon(input: {
  code: string;
  userId: string;
  orderAmount: number;
}): Promise<CouponValidationResult> {
  const db = createAdminClient();
  const code = input.code.trim().toUpperCase();

  const { data: coupon, error } = await db
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !coupon) {
    return { valid: false, discountAmount: 0, error: "Invalid coupon code" };
  }

  const c = coupon as {
    id: string;
    discount_type: string;
    discount_value: number;
    min_order_amount: number;
    start_date: string;
    expiry_date: string;
    usage_limit: number;
    used_count: number;
  };

  const today = new Date().toISOString().slice(0, 10);
  if (today < c.start_date) return { valid: false, discountAmount: 0, error: "Coupon not yet active" };
  if (today > c.expiry_date) return { valid: false, discountAmount: 0, error: "Coupon has expired" };
  if (c.used_count >= c.usage_limit) return { valid: false, discountAmount: 0, error: "Coupon usage limit reached" };
  if (input.orderAmount < Number(c.min_order_amount)) {
    return { valid: false, discountAmount: 0, error: `Minimum order ₹${c.min_order_amount} required` };
  }

  const { data: used } = await db
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_id", c.id)
    .eq("user_id", input.userId)
    .limit(1);
  if (used && used.length > 0) {
    return { valid: false, discountAmount: 0, error: "You have already used this coupon" };
  }

  let discountAmount =
    c.discount_type === "percentage"
      ? Math.round(input.orderAmount * (Number(c.discount_value) / 100))
      : Number(c.discount_value);

  discountAmount = Math.min(discountAmount, input.orderAmount);

  return { valid: true, couponId: c.id, discountAmount };
}

export async function redeemCoupon(input: {
  couponId: string;
  userId: string;
  bookingId: string;
  discountAmount: number;
}) {
  const db = createAdminClient();
  await db.from("coupon_redemptions").insert({
    coupon_id: input.couponId,
    user_id: input.userId,
    booking_id: input.bookingId,
    discount_amount: input.discountAmount,
  });

  const { data: coupon } = await db.from("coupons").select("used_count").eq("id", input.couponId).single();
  await db
    .from("coupons")
    .update({ used_count: Number((coupon as { used_count: number }).used_count) + 1 })
    .eq("id", input.couponId);
}

export async function listCoupons(activeOnly = true) {
  const db = createAdminClient();
  let query = db.from("coupons").select("*").order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) return [];
  return data ?? [];
}

export async function createCoupon(input: {
  code: string;
  discountType: "flat" | "percentage";
  discountValue: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  minOrderAmount?: number;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("coupons")
    .insert({
      code: input.code.trim().toUpperCase(),
      discount_type: input.discountType,
      discount_value: input.discountValue,
      start_date: input.startDate,
      expiry_date: input.expiryDate,
      usage_limit: input.usageLimit ?? 100,
      min_order_amount: input.minOrderAmount ?? 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}
