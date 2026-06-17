import { createAdminClient } from "@/lib/supabase/admin";

export type LoyaltyTier = "silver" | "gold" | "platinum";

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  silver: 0,
  gold: 500,
  platinum: 2000,
};

const TIER_DISCOUNTS: Record<LoyaltyTier, number> = {
  silver: 0,
  gold: 5,
  platinum: 10,
};

export async function addLoyaltyPoints(userId: string, points: number) {
  const db = createAdminClient();
  const { data: user } = await db
    .from("users")
    .select("loyalty_points, loyalty_tier")
    .eq("id", userId)
    .maybeSingle();

  const current = Number((user as { loyalty_points?: number } | null)?.loyalty_points ?? 0);
  const newPoints = current + points;
  const newTier = calculateTier(newPoints);

  await db
    .from("users")
    .update({ loyalty_points: newPoints, loyalty_tier: newTier })
    .eq("id", userId);

  return { points: newPoints, tier: newTier };
}

function calculateTier(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.platinum) return "platinum";
  if (points >= TIER_THRESHOLDS.gold) return "gold";
  return "silver";
}

export function getLoyaltyDiscount(tier: LoyaltyTier): number {
  return TIER_DISCOUNTS[tier] ?? 0;
}

export async function getLoyaltyStatus(userId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("users")
    .select("loyalty_points, loyalty_tier")
    .eq("id", userId)
    .maybeSingle();

  const points = Number((data as { loyalty_points?: number } | null)?.loyalty_points ?? 0);
  const tier = ((data as { loyalty_tier?: string } | null)?.loyalty_tier ?? "silver") as LoyaltyTier;

  const nextTier =
    tier === "silver" ? "gold" : tier === "gold" ? "platinum" : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  return {
    tier,
    points,
    discountPercent: getLoyaltyDiscount(tier),
    nextTier,
    pointsToNext: nextThreshold ? nextThreshold - points : 0,
    benefits:
      tier === "platinum"
        ? ["10% extra discount", "Priority support", "Exclusive offers"]
        : tier === "gold"
          ? ["5% extra discount", "Priority support"]
          : ["Earn points on every trip"],
  };
}
